import client from "../../lib/adapters/nodeAdapter";
export interface Site {
  id: number;
  name: string;
}
export interface Floor {
  id: number;
  site_id: number;
  name: string;
  level: number;
}
export interface Room {
  image?: string | null;
  is_default: boolean;
  id: number;
  floor_id: number;
  name: string;
  capacity: number;
  equipment: string;
  status: "active" | "maintenance";
  site_id: number;
  level: number;
  floor_name: string;
  site_name: string;
}
export interface Catalog {
  sites: Site[];
  floors: Floor[];
  rooms: Room[];
  home_floor_id: number | null;
  admin_floor_ids: number[];
  today: string;
}
export interface Booking {
  id: number;
  room_id: number;
  created_by: number;
  title: string;
  mode: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  participants: string[];
  participant_count: number;
  incharge: string;
  phone: string;
  note: string;
  status: string;
  reason: string | null;
  room_name: string;
  floor_id: number;
  floor_name: string;
  site_name: string;
  creator_name: string;
  can_manage: boolean;
  can_cancel: boolean;
}
export interface Notice {
  id: number;
  booking_id: number;
  message: string;
  read_at: string | null;
  created_at: string;
}
export interface AccessUser {
  id: number;
  name: string;
  email: string;
  role: string;
  meeting_floor_id: number | null;
}
export interface Access {
  users: AccessUser[];
  assignments: { user_id: number; floor_id: number }[];
  email: { configured: boolean; pending: number; failed: number };
}
export const api = {
  catalog: async () => (await client.get<Catalog>("/api/meeting/catalog")).data,
  bookings: async (from: string, to: string) =>
    (
      await client.get<Booking[]>("/api/meeting/bookings", {
        params: { from, to },
      })
    ).data,
  book: async (data: unknown) =>
    (await client.post<Booking>("/api/meeting/bookings", data)).data,
  update: async (id: number, data: unknown) =>
    (await client.put<Booking>("/api/meeting/bookings/" + id, data)).data,
  action: async (id: number, action: string, reason: string) =>
    (await client.patch("/api/meeting/bookings/" + id, { action, reason }))
      .data,
  notices: async () =>
    (await client.get<Notice[]>("/api/meeting/notifications")).data,
  read: async () => client.patch("/api/meeting/notifications/read"),
  room: async (id: number | null, data: unknown) =>
    id
      ? client.put("/api/meeting/rooms/" + id, data)
      : client.post("/api/meeting/rooms", data),
  deleteRoom: async (id: number) => client.delete("/api/meeting/rooms/" + id),
  access: async () => (await client.get<Access>("/api/meeting/access")).data,
  saveAccess: async (id: number, data: unknown) =>
    client.put("/api/meeting/access/" + id, data),
};
export function errorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || "Không thể kết nối máy chủ. Vui lòng thử lại."
  );
}
export function todayVN() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function addDays(day: string, n: number) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
