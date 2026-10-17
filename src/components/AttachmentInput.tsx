export default function AttachmentInput({ files, onFilesChange, links, onLinksChange }: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  links: string;
  onLinksChange: (links: string) => void;
}) {
  return <div className="d-flex flex-column gap-2">
    <input type="file" className="form-control" multiple
      accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.tif,.tiff,.xls,.xlsx"
      aria-label="Chọn tệp đính kèm"
      onChange={e => {
        const selected = Array.from(e.target.files ?? []);
        const error = selected.length > 5 ? 'Chỉ chọn tối đa 5 tệp.' :
          selected.some(file => file.size > 10 * 1024 * 1024) ? 'Mỗi tệp tối đa 10 MB.' : '';
        e.target.setCustomValidity(error);
        if (error) e.target.reportValidity();
        onFilesChange(selected);
      }} />
    <small className="text-muted">PDF, ảnh, Excel (.xls, .xlsx). Tối đa 5 tệp, 10 MB/tệp.</small>
    {files.length > 0 && <small className="text-break">{files.map(file => file.name).join(', ')}</small>}
    <textarea className="form-control" rows={2} value={links}
      aria-label="Đường link đính kèm"
      placeholder="Đường link https://... (mỗi dòng một link)"
      onChange={e => {
        const entries = e.target.value.split(/\r?\n/).map(link => link.trim()).filter(Boolean);
        const valid = entries.length <= 20 && entries.every(link => {
          try { const url = new URL(link); return ['http:', 'https:'].includes(url.protocol) && link.length <= 500; }
          catch { return false; }
        });
        e.target.setCustomValidity(valid ? '' : 'Nhập link HTTP/HTTPS hợp lệ, tối đa 500 ký tự/link và 20 link.');
        onLinksChange(e.target.value);
      }} />
  </div>;
}
