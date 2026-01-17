use std::time::{SystemTime, UNIX_EPOCH};
use fs_extra::file;

pub fn get_current_timestamp_millis() -> u128 {
    let now = SystemTime::now();
    let duration = now
        .duration_since(UNIX_EPOCH)
        .expect("Failed to get duration since UNIX EPOCH");
    // 转换为毫秒：秒数 * 1000 + 纳秒数 / 1_000_000
    duration.as_secs() as u128 * 1000 + duration.subsec_nanos() as u128 / 1_000_000
}

pub fn copy_file(src_path: &str, dest_path: &str) {
    let mut copy_options = file::CopyOptions::new();
    copy_options.overwrite = true;
    copy_options.buffer_size = 4096;
    let _ = file::copy(src_path, dest_path, &copy_options);
}
