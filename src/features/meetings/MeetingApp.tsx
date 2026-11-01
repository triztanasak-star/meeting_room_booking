import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiCalendar,
  FiGrid,
  FiList,
  FiUsers,
  FiBell,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiX,
  FiMapPin,
  FiMonitor,
  FiSearch,
  FiCheck,
  FiSettings,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../lib/i18n";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  api,
  addDays,
  todayVN,
  errorMessage,
  type Booking,
  type Catalog,
  type Room,
  type AccessUser,
  type Access,
} from "./api";
import "./meetings.css";

const words: Record<string, string> = {
  "Ảnh phòng": "Room photo",
  "Xóa ảnh": "Remove photo",
  "Đang xử lý ảnh…": "Processing photo…",
  "Chọn ảnh JPEG, PNG hoặc WebP tối đa 5 MB. Ảnh sẽ được thu gọn tự động.": "Choose a JPEG, PNG or WebP up to 5 MB. Photos are automatically resized.",
  "Không thể đọc ảnh. Hãy chọn ảnh JPEG, PNG hoặc WebP hợp lệ, tối đa 5 MB.": "Cannot read photo. Choose a valid JPEG, PNG or WebP up to 5 MB.",
  "Giao diện sáng": "Light theme",
  "Giao diện tối": "Dark theme",
  "Có": "Yes",
  "Không": "No",
  "Xóa phòng": "Delete room",
  "Đã xóa phòng.": "Room deleted.",
  "Xác nhận xóa phòng": "Confirm deletion of room",
  "Lịch phòng họp": "Calendar",
  "Lịch của tôi": "My bookings",
  "Quản lý đặt phòng": "Booking management",
  "Danh mục phòng": "Room management",
  "Phân quyền phòng": "Room access",
  "Tài khoản": "Users",
  "Đăng xuất": "Sign out",
  "Đặt phòng": "Book room",
  "Tổng quan": "Overview",
  "Hôm nay": "Today",
  "Tất cả": "All",
  "Tìm cuộc họp, phòng…": "Search meetings, rooms…",
  Tầng: "Floor",
  "Chờ duyệt": "Pending",
  "Đã duyệt": "Approved",
  "Của tôi · Đã duyệt": "Mine · Approved",
  "Của tôi · Chờ duyệt": "Mine · Pending",
  "Từ chối": "Rejected",
  "Đã hủy": "Cancelled",
  "Bảo trì": "Maintenance",
  "Còn trống": "Available",
  "Lịch đặt": "Bookings",
  "Phòng họp": "Meeting rooms",
  "Thông báo": "Notifications",
  "Đánh dấu đã đọc": "Mark all read",
  "Chưa có thông báo.": "No notifications yet.",
  "Đang tải…": "Loading…",
  "Thử lại": "Retry",
  "Không có lịch đặt trong khoảng thời gian này.":
    "No bookings in this date range.",
  "Không tìm thấy phòng phù hợp.": "No matching rooms.",
  "Chọn phòng": "Select room",
  "Một ngày": "Single day",
  "Nhiều ngày": "Multiple day",
  "Từ ngày": "Start date",
  "Đến ngày": "End date",
  "Bắt đầu": "Start time",
  "Kết thúc": "End time",
  "Tên cuộc họp": "Meeting title",
  "Người tham gia": "Participants",
  "Số người tham dự": "Participant count",
  "Người phụ trách": "In charge",
  "Số điện thoại": "Phone number",
  "Ghi chú hỗ trợ setup": "Setup notes",
  "Nhập username hoặc email, phân cách bằng dấu phẩy. Tự thêm @cp.com.vn.":
    "Enter usernames or emails separated by commas. @cp.com.vn is added automatically.",
  "Đặt nhiều ngày chỉ áp dụng trọn ngày 07:30–17:30. Chừa 30 phút giữa hai cuộc họp.":
    "Multiple day bookings use 07:30–17:30. Allow 30 minutes between meetings.",
  "Xóa thông tin": "Reset",
  "Đang lưu…": "Saving…",
  "Chi tiết cuộc họp": "Meeting details",
  "Người đặt": "Booked by",
  "Phê duyệt": "Approve",
  "Hủy đặt phòng": "Cancel booking",
  "Lý do": "Reason",
  "Xác nhận": "Confirm",
  "Quay lại": "Back",
  Lưu: "Save",
  "Tên phòng": "Room name",
  "Sức chứa": "Capacity",
  "Thiết bị": "Equipment",
  "Trạng thái": "Status",
  "Thêm phòng": "Add room",
  "Chỉnh sửa": "Edit",
  "Hoạt động": "Active",
  "Phòng mặc định": "Default room",
  "Quản trị các phòng": "Managed rooms",
  "Chưa cấu hình": "Not configured",
  "Lưu thay đổi": "Save changes",
  "Đã lưu thay đổi.": "Changes saved.",
  "Đã đặt phòng thành công.": "Room booked successfully.",
  "Yêu cầu đã gửi quản trị phòng duyệt.":
    "Request sent to the room administrator.",
  "Đã cập nhật lịch đặt.": "Booking updated.",
  "Quản lý Phòng họp 1, Phòng họp 2 và Phòng họp nhà máy.":
    "Manage Meeting room 1, Meeting room 2 and Factory meeting room.",
  "Phòng mặc định/phòng được gán: tự duyệt, đặt trong 30 ngày. Phòng khác: chờ duyệt, đặt trong 3 ngày tính cả hôm nay.":
    "Default/assigned room: automatic approval, 30-day window. Other rooms: approval required, 3-day window including today.",
  "Trang chủ": "Home",
  "Hướng dẫn đặt phòng": "Booking guide",
  "Chọn phòng họp; kiểm tra lịch trống rồi nhấn Đặt phòng.":
    "Select a meeting room, check availability, then book.",
  "Người dùng": "User",
  "Quản trị viên": "Administrator",
  "Quản lý": "Manager",
  Đóng: "Close",
  Đến: "To",
  "Đặt lịch cho không gian làm việc của bạn.":
    "Find a space for your next meeting.",
  "Lịch tuần": "Weekly calendar",
  "Danh sách": "List",
  "Số chỗ": "Seats",
  "Đăng nhập hệ thống đặt phòng họp": "Sign in to Meeting Room Booking",
};
function useText() {
  const { i18n } = useTranslation();
  return (s: string) => (i18n.language.startsWith("en") ? words[s] || s : s);
}
const statusText = (status: string) =>
  ({
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
    cancelled: "Đã hủy",
  })[status] || status;
const useCatalog = () =>
  useQuery({ queryKey: ["meeting", "catalog"], queryFn: api.catalog });
function NoticeError({ error, retry }: { error: unknown; retry?: () => void }) {
  const t = useText();
  return (
    <div role="alert" className="mr-alert error">
      {errorMessage(error)}{" "}
      {retry && <button onClick={retry}>{t("Thử lại")}</button>}
    </div>
  );
}
function Badge({ status }: { status: string }) {
  const t = useText();
  return <span className={"mr-badge " + status}>{t(statusText(status))}</span>;
}
export function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  const t = useText();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && ref.current) {
        const nodes = Array.from(
          ref.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ),
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div className="mr-shade">
      <section
        ref={ref}
        tabIndex={-1}
        className="mr-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="mr-icon" aria-label={t("Đóng")} onClick={close}>
            <FiX />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function MeetingLayout() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, can } = useAuth();
  const { i18n } = useTranslation();
  const t = useText();
  const [notices, setNotices] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const location = useLocation();
  const catalog = useCatalog();
  const notifications = useQuery({
    queryKey: ["meeting", "notifications"],
    queryFn: api.notices,
    refetchInterval: 30000,
  });
  const qc = useQueryClient();
  const nav = [
    ["/calendar", "Lịch phòng họp", FiCalendar],
    ["/my-bookings", "Lịch của tôi", FiList],
    ["/bookings", "Quản lý đặt phòng", FiGrid],
    ["/vehicles", "Đặt xe nhà máy", FiMapPin],
    ["/vehicle-bookings", "Quản lý đặt xe", FiGrid],
  ] as const;
  const admin = [
    ["/rooms", "Danh mục phòng", FiMonitor],
    ["/access", "Phân quyền phòng", FiSettings],
    ["/users", "Tài khoản", FiUsers],
  ] as const;
  return (
    <div className="mr-app" data-theme={theme}>
      <aside className="mr-sidebar">
        <NavLink to="/calendar" className="mr-brand">
          <span className="mr-brand-mark">
            <FiCalendar />
          </span>
          <span>
            MEETING ROOM<small>BOOKING</small>
          </span>
        </NavLink>
        <div className="mr-nav-label">WORKSPACE</div>
        <nav>
          {nav.filter(([url]) => !["/bookings", "/vehicle-bookings"].includes(url) || can("manager-or-admin")).map(([url, label, Icon]) => (
            <NavLink key={url} to={url}>
              <Icon />
              {t(label)}
            </NavLink>
          ))}
        </nav>
        {can("admin") && (
          <>
            <div className="mr-nav-label">ADMINISTRATION</div>
            <nav>
              {admin.map(([url, label, Icon]) => (
                <NavLink key={url} to={url}>
                  <Icon />
                  {t(label)}
                </NavLink>
              ))}
            </nav>
          </>
        )}
        <div className="mr-sidebar-bottom">
          <div className="mr-profile">
            <span>{user?.name?.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user?.name}</strong>
              <small>{t(user?.role === "admin" ? "Quản trị viên" : user?.role === "manager" ? "Quản lý" : "Người dùng")}</small>
            </div>
          </div>
          <button
            onClick={() => {
              void logout().catch((e) => setLogoutError(errorMessage(e)));
            }}
          >
            <FiLogOut />
            {t("Đăng xuất")}
          </button>
          {logoutError && <small role="alert">{logoutError}</small>}
        </div>
      </aside>
      <div className="mr-main">
        <header className="mr-topbar">
          <div>
            <span className="mr-top-dot" /> Meeting Room Booking{" "}
            <span className="mr-top-separator">/</span>{" "}
            <span className="mr-muted">
              {t(
                [...nav, ...admin].find(
                  (x) => x[0] === location.pathname,
                )?.[1] || "Trang chủ",
              )}
            </span>
          </div>
          <div className="mr-top-actions">
            <button
              className="mr-theme-toggle"
              onClick={toggleTheme}
              aria-label={t(theme === "light" ? "Giao diện tối" : "Giao diện sáng")}
              title={t(theme === "light" ? "Giao diện tối" : "Giao diện sáng")}
            >
              {theme === "light" ? <FiMoon /> : <FiSun />}
              <span>{t(theme === "light" ? "Giao diện tối" : "Giao diện sáng")}</span>
            </button>
            <select
              aria-label="Language"
              value={i18n.language.startsWith("en") ? "en" : "vi"}
              onChange={(e) => changeLanguage(e.target.value as "en" | "vi")}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
            <button
              className="mr-icon mr-bell"
              onClick={() => setNotices(!notices)}
              aria-label={t("Thông báo")}
            >
              <FiBell />
              {notifications.data?.some((n) => !n.read_at) && <i />}
            </button>
          </div>
        </header>
        {notices && (
          <section className="mr-notices">
            <div className="mr-between">
              <h3>{t("Thông báo")}</h3>
              <button
                onClick={() =>
                  void api.read().then(() =>
                    qc.invalidateQueries({
                      queryKey: ["meeting", "notifications"],
                    }),
                  )
                }
              >
                {t("Đánh dấu đã đọc")}
              </button>
            </div>
            {notifications.error && <NoticeError error={notifications.error} />}
            {notifications.data?.length === 0 && (
              <p>{t("Chưa có thông báo.")}</p>
            )}
            {notifications.data?.map((n) => (
              <div className={n.read_at ? "" : "unread"} key={n.id}>
                <strong>{n.message}</strong>
                <small>
                  {new Date(n.created_at).toLocaleString(i18n.language, {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </small>
              </div>
            ))}
          </section>
        )}
        <main className="mr-content">
          {catalog.error ? (
            <NoticeError
              error={catalog.error}
              retry={() => void catalog.refetch()}
            />
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="mr-footer">
          MEETING ROOM BOOKING <span>MEETING ROOMS · HRM</span>
        </footer>
      </div>
    </div>
  );
}

type Draft = {
  id?: number;
  room_id: string;
  mode: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  title: string;
  participants: string;
  participant_count: string;
  incharge: string;
  phone: string;
  note: string;
};
function newDraft(name: string): Draft {
  const day = todayVN();
  return {
    room_id: "",
    mode: "single",
    start_date: day,
    end_date: day,
    start_time: "08:00",
    end_time: "09:00",
    title: "",
    participants: "",
    participant_count: "1",
    incharge: name,
    phone: "",
    note: "",
  };
}
function BookingForm({
  catalog,
  draft,
  setDraft,
  close,
  success,
}: {
  catalog: Catalog;
  draft: Draft;
  setDraft: (d: Draft) => void;
  close: () => void;
  success: (message: string) => void;
}) {
  const t = useText();
  const { user } = useAuth();
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const room = catalog.rooms.find((r) => r.id === Number(draft.room_id));
  const auto =
    room && (room.is_default || room.floor_id === catalog.home_floor_id);
  const max = addDays(catalog.today, auto ? 29 : 2);
  const field = (key: keyof Draft, value: string) =>
    setDraft({
      ...draft,
      [key]: value,
      ...(key === "start_date" && draft.mode === "single"
        ? { end_date: value }
        : {}),
      ...(key === "mode"
        ? value === "multiple"
          ? { start_time: "07:30", end_time: "17:30" }
          : { end_date: draft.start_date }
        : {}),
    });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...draft,
        room_id: Number(draft.room_id),
        participant_count: Number(draft.participant_count),
      };
      const result = await (draft.id
        ? api.update(draft.id, payload)
        : api.book(payload));
      setDraft(newDraft(user?.name || ""));
      success(
        t(
          draft.id
            ? "Đã cập nhật lịch đặt."
            : result.status === "approved"
              ? "Đã đặt phòng thành công."
              : "Yêu cầu đã gửi quản trị phòng duyệt.",
        ),
      );
      close();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog title={t(draft.id ? "Chỉnh sửa" : "Đặt phòng")} close={close}>
      <form onSubmit={submit} className="mr-form">
        <div className="mr-dialog-body">
          {!!error && <NoticeError error={error} />}
          <label>
            {t("Chọn phòng")} *
            <select
              value={draft.room_id}
              onChange={(e) => field("room_id", e.target.value)}
              required
            >
              <option value="">— {t("Chọn phòng")} —</option>
              {catalog.rooms
                .filter((r) => r.status === "active")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.capacity})
                  </option>
                ))}
            </select>
          </label>
          {room && (
            <div className="mr-room-summary">
              <FiMonitor />
              <div>
                <strong>{room.name}</strong>
                <small>
                  {room.name} · {room.capacity}{" "}
                  {t("Số chỗ")}
                  <br />
                  {room.equipment}
                </small>
              </div>
            </div>
          )}
          <div className="mr-segment">
            <label>
              <input
                type="radio"
                checked={draft.mode === "single"}
                onChange={() => field("mode", "single")}
              />
              {t("Một ngày")}
            </label>
            <label>
              <input
                type="radio"
                checked={draft.mode === "multiple"}
                onChange={() => field("mode", "multiple")}
              />
              {t("Nhiều ngày")}
            </label>
          </div>
          <div className="mr-info">
            {t(
              "Phòng mặc định/phòng được gán: tự duyệt, đặt trong 30 ngày. Phòng khác: chờ duyệt, đặt trong 3 ngày tính cả hôm nay.",
            )}
          </div>
          <div className="mr-form-grid">
            <label>
              {t("Từ ngày")} *
              <input
                type="date"
                required
                min={draft.id ? draft.start_date : catalog.today}
                max={max}
                value={draft.start_date}
                onChange={(e) => field("start_date", e.target.value)}
              />
            </label>
            <label>
              {t("Đến ngày")} *
              <input
                type="date"
                required
                disabled={draft.mode === "single"}
                min={draft.start_date}
                max={max}
                value={draft.end_date}
                onChange={(e) => field("end_date", e.target.value)}
              />
            </label>
            <label>
              {t("Bắt đầu")} *
              <input
                type="time"
                required
                disabled={draft.mode === "multiple"}
                value={draft.start_time}
                onChange={(e) => field("start_time", e.target.value)}
              />
            </label>
            <label>
              {t("Kết thúc")} *
              <input
                type="time"
                required
                disabled={draft.mode === "multiple"}
                value={draft.end_time}
                onChange={(e) => field("end_time", e.target.value)}
              />
            </label>
          </div>
          <small className="mr-muted">
            {t(
              "Đặt nhiều ngày chỉ áp dụng trọn ngày 07:30–17:30. Chừa 30 phút giữa hai cuộc họp.",
            )}
          </small>
          <label>
            {t("Tên cuộc họp")} *
            <input
              required
              maxLength={255}
              value={draft.title}
              onChange={(e) => field("title", e.target.value)}
            />
          </label>
          <label>
            {t("Người tham gia")}
            <textarea
              rows={2}
              value={draft.participants}
              onChange={(e) => field("participants", e.target.value)}
            />
            <small>
              {t(
                "Nhập username hoặc email, phân cách bằng dấu phẩy. Tự thêm @cp.com.vn.",
              )}
            </small>
          </label>
          <div className="mr-form-grid">
            <label>
              {t("Số người tham dự")} *
              <input
                type="number"
                required
                min={1}
                max={room?.capacity || 1000}
                value={draft.participant_count}
                onChange={(e) => field("participant_count", e.target.value)}
              />
            </label>
            <label>
              {t("Người phụ trách")} *
              <input
                required
                maxLength={255}
                value={draft.incharge}
                onChange={(e) => field("incharge", e.target.value)}
              />
            </label>
          </div>
          <label>
            {t("Số điện thoại")} *
            <input
              type="tel"
              required
              maxLength={40}
              value={draft.phone}
              onChange={(e) => field("phone", e.target.value)}
            />
          </label>
          <label>
            {t("Ghi chú hỗ trợ setup")}
            <textarea
              rows={3}
              maxLength={4000}
              placeholder="Micro, bàn ghế, máy dịch…"
              value={draft.note}
              onChange={(e) => field("note", e.target.value)}
            />
          </label>
        </div>
        <footer>
          <button
            type="button"
            className="mr-button secondary"
            disabled={saving}
            onClick={() => {
              setDraft({ ...newDraft(user?.name || ""), id: draft.id });
              setError(null);
            }}
          >
            {t("Xóa thông tin")}
          </button>
          <button className="mr-button" disabled={saving}>
            {saving
              ? t("Đang lưu…")
              : t(draft.id ? "Lưu thay đổi" : "Đặt phòng")}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

function BookingDetail({
  booking,
  close,
  success,
  edit,
}: {
  booking: Booking;
  close: () => void;
  success: (message: string) => void;
  edit: () => void;
}) {
  const t = useText();
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.action(booking.id, action, reason);
      success(t("Đã cập nhật lịch đặt."));
      close();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog title={t("Chi tiết cuộc họp")} close={close}>
      <div className="mr-dialog-body">
        <Badge status={booking.status} />
        <h2 className="mr-detail-title">{booking.title}</h2>
        <div className="mr-room-summary">
          <FiMapPin />
          <div>
            <strong>{booking.room_name}</strong>
            <small>
              {booking.room_name}
            </small>
          </div>
        </div>
        <dl className="mr-details">
          <dt>{t("Từ ngày")}</dt>
          <dd>
            {booking.start_date} → {booking.end_date}
          </dd>
          <dt>{t("Lịch đặt")}</dt>
          <dd>
            {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)}{" "}
            (UTC+7)
          </dd>
          <dt>{t("Người đặt")}</dt>
          <dd>{booking.creator_name}</dd>
          <dt>{t("Số người tham dự")}</dt>
          <dd>{booking.participant_count}</dd>
          {[
            ["Người phụ trách", booking.incharge],
            ["Số điện thoại", booking.phone],
            ["Người tham gia", booking.participants.join(", ")],
            ["Ghi chú hỗ trợ setup", booking.note],
            ["Lý do", booking.reason],
          ]
            .filter((x) => x[1])
            .map(([label, value]) => (
              <div className="mr-dl-row" key={label}>
                <dt>{t(label!)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        {!!error && <NoticeError error={error} />}
        {!action ? (
          <div className="mr-actions">
            {booking.can_cancel && (
              <button className="mr-button secondary" onClick={edit}>
                {t("Chỉnh sửa")}
              </button>
            )}
            {booking.can_manage && booking.status === "pending" && (
              <>
                <button
                  className="mr-button"
                  onClick={() => setAction("approve")}
                >
                  <FiCheck />
                  {t("Phê duyệt")}
                </button>
                <button
                  className="mr-button danger"
                  onClick={() => setAction("reject")}
                >
                  {t("Từ chối")}
                </button>
              </>
            )}
            {booking.can_cancel && (
              <button
                className="mr-button danger secondary"
                onClick={() => setAction("cancel")}
              >
                {t("Hủy đặt phòng")}
              </button>
            )}
          </div>
        ) : (
          <form className="mr-form" onSubmit={run}>
            {action !== "approve" && (
              <label>
                {t("Lý do")} *
                <textarea
                  autoFocus
                  required
                  maxLength={2000}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            )}
            <p>
              {t(
                action === "approve"
                  ? "Phê duyệt"
                  : action === "cancel"
                    ? "Hủy đặt phòng"
                    : "Từ chối",
              )}{" "}
              · #{booking.id}
            </p>
            <div className="mr-actions">
              <button disabled={saving} className="mr-button">
                {saving ? t("Đang lưu…") : t("Xác nhận")}
              </button>
              <button
                type="button"
                className="mr-button secondary"
                disabled={saving}
                onClick={() => setAction("")}
              >
                {t("Quay lại")}
              </button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}

export function CalendarPage({
  view = "calendar",
}: {
  view?: "calendar" | "mine" | "manage";
}) {
  const t = useText();
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const catalog = useCatalog();
  const qc = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(todayVN());
  const [endDate, setEndDate] = useState(addDays(todayVN(), 29));
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => newDraft(user?.name || ""));
  const [detail, setDetail] = useState<Booking | null>(null);
  const [message, setMessage] = useState("");
  const to = view === "calendar" ? addDays(date, 6) : endDate;
  const bookings = useQuery({
    queryKey: ["meeting", "bookings", date, to],
    queryFn: () => api.bookings(date, to),
    refetchInterval: 30000,
  });
  const selectedRoomId = view === "calendar" ? "all" : selectedRoom || "all";
  const rooms =
    catalog.data?.rooms.filter(
      (r) =>
        (selectedRoomId === "all" || r.id === Number(selectedRoomId)) &&
        (!search ||
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          bookings.data?.some(
            (b) =>
              b.room_id === r.id &&
              b.title.toLowerCase().includes(search.toLowerCase()),
          )),
    ) || [];
  const visible =
    bookings.data?.filter(
      (b) =>
        (view === "mine"
          ? b.created_by === user?.id
          : view === "manage"
            ? b.can_manage || b.created_by === user?.id
            : true) &&
        (!status || b.status === status) &&
        (!search ||
          `${b.title} ${b.room_name}`
            .toLowerCase()
            .includes(search.toLowerCase())),
    ) || [];
  const refresh = (msg: string) => {
    setMessage(msg);
    void qc.invalidateQueries({ queryKey: ["meeting"] });
  };
  const open = (room?: Room, day?: string) => {
    setMessage("");
    setDraft({
      ...draft,
      id: undefined,
      ...(room ? { room_id: String(room.id) } : {}),
      ...(day ? { start_date: day, end_date: day, mode: "single" } : {}),
    });
    setForm(true);
  };
  const title =
    view === "calendar"
      ? "Lịch phòng họp"
      : view === "mine"
        ? "Lịch của tôi"
        : "Quản lý đặt phòng";
  if (catalog.isLoading) return <p>{t("Đang tải…")}</p>;
  if (!catalog.data) return null;
  return (
    <>
      <div className="mr-page-heading">
        <div>
          <p className="mr-eyebrow">MEETING ROOM BOOKING</p>
          <h1>{t(title)}</h1>
          <p className="mr-muted">
            {t("Đặt lịch cho không gian làm việc của bạn.")}
          </p>
        </div>
        <button className="mr-button" onClick={() => open()}>
          <FiPlus />
          {t("Đặt phòng")}
        </button>
      </div>
      {message && (
        <div role="status" className="mr-alert success">
          {message}
        </div>
      )}
      <div className="mr-stats">
        {[
          [
            t("Phòng họp"),
            catalog.data.rooms.filter((r) => r.status === "active").length,
            FiMonitor,
          ],
          [
            t("Đã duyệt"),
            visible.filter((b) => b.status === "approved").length,
            FiCheck,
          ],
          [
            t("Chờ duyệt"),
            visible.filter((b) => b.status === "pending").length,
            FiCalendar,
          ],
        ].map(([label, value, Icon]) => {
          const I = Icon as typeof FiMonitor;
          return (
            <div key={String(label)}>
              <span className="mr-stat-icon">
                <I />
              </span>
              <div>
                <span>{String(label)}</span>
                <strong>{String(value)}</strong>
              </div>
              <small>
                {label === t("Phòng họp")
                  ? "Phòng họp"
                  : t(view === "calendar" ? "Lịch tuần" : "Danh sách")}
              </small>
            </div>
          );
        })}
      </div>
      <section className="mr-panel">
        <div className="mr-toolbar">
          {view !== "calendar" && <div className="mr-site-tabs">
              <button
                className={selectedRoomId === "all" ? "active" : ""}
                onClick={() => setSelectedRoom("all")}
              >
                {t("Tất cả")}
              </button>
            {catalog.data.rooms.map((room) => (
              <button
                key={room.id}
                className={selectedRoomId === String(room.id) ? "active" : ""}
                onClick={() => setSelectedRoom(String(room.id))}
              >
                <FiMapPin />
                {room.name}
              </button>
            ))}
          </div>}
          <label className="mr-search">
            <FiSearch />
            <input
              aria-label={t("Tìm cuộc họp, phòng…")}
              placeholder={t("Tìm cuộc họp, phòng…")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {view === "calendar" ? (
          <>
            <div className="mr-calendar-controls">
              <div className="mr-actions">
                <button
                  className="mr-button secondary compact"
                  onClick={() => setDate(todayVN())}
                >
                  {t("Hôm nay")}
                </button>
                <button
                  className="mr-icon"
                  aria-label="Previous week"
                  onClick={() => setDate(addDays(date, -7))}
                >
                  <FiChevronLeft />
                </button>
                <input
                  aria-label={t("Từ ngày")}
                  type="date"
                  value={date}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                />
                <button
                  className="mr-icon"
                  aria-label="Next week"
                  onClick={() => setDate(addDays(date, 7))}
                >
                  <FiChevronRight />
                </button>
              </div>
              <div className="mr-legend">
                <span className="approved">{t("Đã duyệt")}</span>
                <span className="pending">{t("Chờ duyệt")}</span>
                <span className="maintenance">{t("Bảo trì")}</span>
                <span className="mine-approved">{t("Của tôi · Đã duyệt")}</span>
                <span className="mine-pending">{t("Của tôi · Chờ duyệt")}</span>
              </div>
            </div>
            {bookings.error && (
              <NoticeError
                error={bookings.error}
                retry={() => void bookings.refetch()}
              />
            )}
            {bookings.isLoading ? (
              <p className="mr-empty">{t("Đang tải…")}</p>
            ) : (
              <div className="mr-calendar-scroll">
                <table className="mr-calendar">
                  <thead>
                    <tr>
                      <th>{t("Phòng họp")}</th>
                      {Array.from({ length: 7 }, (_, i) =>
                        addDays(date, i),
                      ).map((day) => (
                        <th
                          key={day}
                          className={day === todayVN() ? "today" : ""}
                        >
                          <small>
                            {new Date(day + "T12:00:00Z").toLocaleDateString(
                              i18n.language,
                              { weekday: "short" },
                            )}
                          </small>
                          <strong>
                            {new Date(day + "T12:00:00Z").toLocaleDateString(
                              i18n.language,
                              { day: "2-digit", month: "2-digit" },
                            )}
                          </strong>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => (
                      <tr key={room.id}>
                        <th>
                          {room.image ? (
                            <img
                              className="mr-calendar-room-photo"
                              src={room.image}
                              alt={room.name}
                              loading="lazy"
                            />
                          ) : <span className="mr-room-icon">
                            <FiMonitor />
                          </span>}
                          <strong>{room.name}</strong>
                          <small>
                            <FiUsers /> {room.capacity}
                          </small>
                          <small>{room.equipment}</small>
                          {room.status === "maintenance" && (
                            <span className="mr-badge maintenance">
                              {t("Bảo trì")}
                            </span>
                          )}
                        </th>
                        {Array.from({ length: 7 }, (_, i) =>
                          addDays(date, i),
                        ).map((day) => {
                          const events = visible.filter(
                            (b) =>
                              b.room_id === room.id &&
                              b.start_date <= day &&
                              b.end_date >= day &&
                              ["pending", "approved"].includes(b.status),
                          );
                          return (
                            <td
                              key={day}
                              className={day === todayVN() ? "today" : ""}
                            >
                              {events.map((b) => (
                                <button
                                  className={
                                    "mr-event " +
                                    b.status +
                                    (b.created_by === user?.id ? " mine" : "")
                                  }
                                  key={b.id}
                                  onClick={() => setDetail(b)}
                                >
                                  <span>
                                    {b.start_time.slice(0, 5)}–
                                    {b.end_time.slice(0, 5)}
                                  </span>
                                  <strong>{b.title}</strong>
                                  <small>{b.creator_name}</small>
                                </button>
                              ))}
                              {room.status === "active" && day >= todayVN() && (
                                <button
                                  className="mr-book-slot"
                                  onClick={() => open(room, day)}
                                >
                                  <FiPlus /> Book
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rooms.length === 0 && (
                  <p className="mr-empty">
                    {t("Không tìm thấy phòng phù hợp.")}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mr-list-filters">
              <label>
                {t("Từ ngày")}
                <input
                  type="date"
                  value={date}
                  max={endDate}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                />
              </label>
              <label>
                {t("Đến ngày")}
                <input
                  type="date"
                  value={endDate}
                  min={date}
                  max={addDays(date, 366)}
                  onChange={(e) => e.target.value && setEndDate(e.target.value)}
                />
              </label>
              <label>
                {t("Trạng thái")}
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">{t("Tất cả")}</option>
                  {["approved", "pending", "rejected", "cancelled"].map((s) => (
                    <option key={s} value={s}>
                      {t(statusText(s))}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {bookings.error ? (
              <NoticeError
                error={bookings.error}
                retry={() => void bookings.refetch()}
              />
            ) : bookings.isLoading ? (
              <p className="mr-empty">{t("Đang tải…")}</p>
            ) : (
              <div className="mr-table-scroll">
                <table className="mr-table">
                  <thead>
                    <tr>
                      {[
                        "Tên cuộc họp",
                        "Phòng họp",
                        "Từ ngày",
                        "Lịch đặt",
                        "Người đặt",
                        "Trạng thái",
                      ].map((x) => (
                        <th key={x}>{t(x)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible
                      .filter(
                        (b) =>
                          selectedRoomId === "all" || b.room_id === Number(selectedRoomId),
                      )
                      .map((b) => (
                        <tr key={b.id}>
                          <td>
                            <button
                              className="mr-link"
                              onClick={() => setDetail(b)}
                            >
                              {b.title}
                            </button>
                            <small>#{b.id}</small>
                          </td>
                          <td>
                            {b.room_name}
                          </td>
                          <td>
                            {b.start_date}
                            <small>
                              {b.end_date !== b.start_date ? b.end_date : ""}
                            </small>
                          </td>
                          <td>
                            {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                          </td>
                          <td>{b.creator_name}</td>
                          <td>
                            <Badge status={b.status} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {visible.filter(
                  (b) =>
                    selectedRoomId === "all" || b.room_id === Number(selectedRoomId),
                ).length === 0 && (
                  <p className="mr-empty">
                    {t("Không có lịch đặt trong khoảng thời gian này.")}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>
      <div className="mr-guide">
        <FiCalendar />
        <div>
          <strong>{t("Hướng dẫn đặt phòng")}</strong>
          <p>
            {t(
              "Chọn phòng họp; kiểm tra lịch trống rồi nhấn Đặt phòng.",
            )}{" "}
            {t(
              "Phòng mặc định/phòng được gán: tự duyệt, đặt trong 30 ngày. Phòng khác: chờ duyệt, đặt trong 3 ngày tính cả hôm nay.",
            )}
          </p>
        </div>
      </div>
      {form && (
        <BookingForm
          catalog={catalog.data}
          draft={draft}
          setDraft={setDraft}
          close={() => setForm(false)}
          success={refresh}
        />
      )}
      {detail && (
        <BookingDetail
          booking={detail}
          close={() => setDetail(null)}
          success={refresh}
          edit={() => {
            setDraft({
              id: detail.id,
              room_id: String(detail.room_id),
              mode: detail.mode,
              start_date: detail.start_date,
              end_date: detail.end_date,
              start_time: detail.start_time.slice(0, 5),
              end_time: detail.end_time.slice(0, 5),
              title: detail.title,
              participants: detail.participants.join(", "),
              participant_count: String(detail.participant_count),
              incharge: detail.incharge,
              phone: detail.phone,
              note: detail.note,
            });
            setDetail(null);
            setForm(true);
          }}
        />
      )}
    </>
  );
}

function RoomImagePicker({ value, onChange, processing, onProcessing, disabled }: {
  value: string | null;
  onChange: (value: string | null) => void;
  processing: boolean;
  onProcessing: (value: boolean) => void;
  disabled: boolean;
}) {
  const t = useText();
  const [error, setError] = useState(false);
  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(false);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(true);
      return;
    }
    onProcessing(true);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const ratio = Math.min(1, 960 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let image = "";
      for (const quality of [0.85, 0.7, 0.55, 0.4, 0.25]) {
        image = canvas.toDataURL("image/jpeg", quality);
        if (image.length <= 180000) break;
      }
      if (image.length > 180000 || !image.startsWith("data:image/jpeg;base64,")) throw new Error("Image too large");
      onChange(image);
    } catch { setError(true); }
    finally { URL.revokeObjectURL(url); onProcessing(false); }
  };
  return (
    <div className="mr-image-picker">
      <label>
        {t("Ảnh phòng")}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void choose(e)} disabled={disabled || processing} />
      </label>
      <small>{t("Chọn ảnh JPEG, PNG hoặc WebP tối đa 5 MB. Ảnh sẽ được thu gọn tự động.")}</small>
      {value && <img className="mr-room-preview" src={value} alt={t("Ảnh phòng")} />}
      {value && <button type="button" className="mr-button secondary compact" disabled={disabled || processing} onClick={() => { onChange(null); setError(false); }}>{t("Xóa ảnh")}</button>}
      {processing && <small role="status">{t("Đang xử lý ảnh…")}</small>}
      {error && <div className="mr-alert error" role="alert">{t("Không thể đọc ảnh. Hãy chọn ảnh JPEG, PNG hoặc WebP hợp lệ, tối đa 5 MB.")}</div>}
    </div>
  );
}

export function RoomsPage() {
  const t = useText();
  const catalog = useCatalog();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Room | null | undefined>(undefined);
  const [image, setImage] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<Room | null>(null);
  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    setError(null);
    try {
      await api.deleteRoom(deleting.id);
      setDeleting(null);
      setMessage(t("Đã xóa phòng."));
      void qc.invalidateQueries({ queryKey: ["meeting"] });
    } catch (e) { setError(e); }
    finally { setSaving(false); }
  };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (processingImage || saving) return;
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setSaving(true);
    setError(null);
    try {
      await api.room(editing?.id || null, {
        ...data,
        capacity: Number(data.capacity),
        is_default: data.is_default === "on",
        image,
      });
      setEditing(undefined);
      setMessage(t("Đã lưu thay đổi."));
      void qc.invalidateQueries({ queryKey: ["meeting"] });
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className="mr-page-heading">
        <div>
          <p className="mr-eyebrow">ADMINISTRATION</p>
          <h1>{t("Danh mục phòng")}</h1>
          <p className="mr-muted">
            {t("Quản lý Phòng họp 1, Phòng họp 2 và Phòng họp nhà máy.")}
          </p>
        </div>
        <button
          className="mr-button"
          onClick={() => {
            setEditing(null);
            setImage(null);
            setError(null);
          }}
        >
          <FiPlus />
          {t("Thêm phòng")}
        </button>
      </div>
      {message && (
        <div role="status" className="mr-alert success">
          {message}
        </div>
      )}
      <div className="mr-room-grid">
        {catalog.data?.rooms.map((room) => (
          <article className="mr-room-card" key={room.id}>
            {room.image ? <img className="mr-room-photo" src={room.image} alt={room.name} loading="lazy" /> : <div className="mr-room-art">
              <FiMonitor />
              <span>
                {room.name}
              </span>
            </div>}
            <div>
              <span className={"mr-badge " + room.status}>
                {t(room.status === "active" ? "Hoạt động" : "Bảo trì")}
              </span>
              <h2>{room.name}</h2>
              <p className="mr-muted">
                {t("Phòng mặc định")}: {t(room.is_default ? "Có" : "Không")}
              </p>
              <p>
                <FiUsers /> {room.capacity} {t("Số chỗ")}
              </p>
              <p className="mr-muted">{room.equipment || "—"}</p>
              <div className="mr-actions">
              <button
                className="mr-button secondary"
                onClick={() => {
                  setEditing(room);
                  setImage(room.image || null);
                  setError(null);
                }}
              >
                {t("Chỉnh sửa")}
              </button>
              <button className="mr-button danger secondary" onClick={() => {
                setDeleting(room);
                setError(null);
              }}>{t("Xóa phòng")}</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {editing !== undefined && (
        <Dialog
          title={t(editing ? "Chỉnh sửa" : "Thêm phòng")}
          close={() => { if (!saving && !processingImage) setEditing(undefined); }}
        >
          <form className="mr-form" onSubmit={submit}>
            <div className="mr-dialog-body">
              {!!error && <NoticeError error={error} />}
              <RoomImagePicker value={image} onChange={setImage} processing={processingImage} onProcessing={setProcessingImage} disabled={saving} />
              <label>
                {t("Tên phòng")} *
                <input
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={editing?.name}
                />
              </label>
              <label className="mr-default-toggle">
                <span>{t("Phòng mặc định")}</span>
                <input type="checkbox" role="switch" name="is_default" defaultChecked={editing?.is_default ?? false} />
              </label>
              <label>
                {t("Sức chứa")} *
                <input
                  type="number"
                  name="capacity"
                  min={1}
                  max={1000}
                  required
                  defaultValue={editing?.capacity || 12}
                />
              </label>
              <label>
                {t("Thiết bị")}
                <textarea
                  name="equipment"
                  maxLength={2000}
                  defaultValue={editing?.equipment}
                />
              </label>
              <label>
                {t("Trạng thái")}
                <select
                  name="status"
                  defaultValue={editing?.status || "active"}
                >
                  <option value="active">{t("Hoạt động")}</option>
                  <option value="maintenance">{t("Bảo trì")}</option>
                </select>
              </label>
            </div>
            <footer>
              <button className="mr-button" disabled={saving || processingImage}>
                {t(saving ? "Đang lưu…" : "Lưu")}
              </button>
            </footer>
          </form>
        </Dialog>
      )}
      {deleting && (
        <Dialog title={t("Xóa phòng")} close={() => { if (!saving) setDeleting(null); }}>
          <div className="mr-dialog-body">
            <p>{t("Xác nhận xóa phòng")}: <strong>{deleting.name}</strong>?</p>
            {!!error && <NoticeError error={error} />}
          </div>
          <footer className="mr-actions">
            <button className="mr-button secondary" disabled={saving} onClick={() => setDeleting(null)}>{t("Quay lại")}</button>
            <button className="mr-button danger" disabled={saving} onClick={() => void remove()}>{t(saving ? "Đang lưu…" : "Xóa phòng")}</button>
          </footer>
        </Dialog>
      )}
    </>
  );
}

function AccessRow({
  user,
  access,
  catalog,
}: {
  user: AccessUser;
  access: Access;
  catalog: Catalog;
}) {
  const t = useText();
  const qc = useQueryClient();
  const [admins, setAdmins] = useState(
    access.assignments
      .filter((a) => a.user_id === user.id)
      .map((a) => a.floor_id),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const save = async () => {
    setSaving(true);
    try {
      await api.saveAccess(user.id, {
        meeting_floor_id: user.meeting_floor_id,
        admin_floor_ids: admins,
      });
      setMessage(t("Đã lưu thay đổi."));
      void qc.invalidateQueries({ queryKey: ["meeting", "catalog"] });
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <article className="mr-access-card">
      <div>
        <strong>{user.name}</strong>
        <small>
          {user.email} · {user.role}
        </small>
      </div>
      <fieldset>
        <legend>{t("Quản trị các phòng")}</legend>
        <div className="mr-checkbox-grid">
          {catalog.floors.filter((f) => catalog.rooms.some((r) => r.floor_id === f.id)).map((f) => (
            <label key={f.id}>
              <input
                type="checkbox"
                checked={admins.includes(f.id)}
                onChange={(e) =>
                  setAdmins(
                    e.target.checked
                      ? [...admins, f.id]
                      : admins.filter((id) => id !== f.id),
                  )
                }
              />
              {f.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <button
          className="mr-button secondary"
          disabled={saving}
          onClick={() => void save()}
        >
          {t(saving ? "Đang lưu…" : "Lưu thay đổi")}
        </button>
        {message && <small role="status">{message}</small>}
      </div>
    </article>
  );
}
export function AccessPage() {
  const t = useText();
  const catalog = useCatalog();
  const access = useQuery({
    queryKey: ["meeting", "access"],
    queryFn: api.access,
  });
  return (
    <>
      <div className="mr-page-heading">
        <div>
          <p className="mr-eyebrow">ADMINISTRATION</p>
          <h1>{t("Phân quyền phòng")}</h1>
          <p className="mr-muted">
            {t(
              "Phòng mặc định/phòng được gán: tự duyệt, đặt trong 30 ngày. Phòng khác: chờ duyệt, đặt trong 3 ngày tính cả hôm nay.",
            )}
          </p>
        </div>
      </div>
      {access.isLoading && <p>{t("Đang tải…")}</p>}
      {access.error && (
        <NoticeError error={access.error} retry={() => void access.refetch()} />
      )}
      {access.data &&
        catalog.data &&
        access.data.users.filter((u) => u.role === "admin" || u.role === "manager").map((u) => (
          <AccessRow
            key={u.id}
            user={u}
            access={access.data}
            catalog={catalog.data!}
          />
        ))}
    </>
  );
}
