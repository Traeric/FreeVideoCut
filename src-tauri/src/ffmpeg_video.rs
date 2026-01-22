use std::fs::File;
use std::io::Write;
use std::process::Command;
use tauri::{AppHandle, Manager};

fn get_ffmpeg_path(app_handle: &AppHandle) -> String {
  let resource_path = app_handle.path().resource_dir().unwrap();
  resource_path.join("third_party")
    .join("ffmpeg")
    .join("bin")
    .join("ffmpeg.exe")
    .to_str().unwrap().to_string()
}

fn get_ffprobe_path(app_handle: &AppHandle) -> String {
  let resource_path = app_handle.path().resource_dir().unwrap();
  resource_path.join("third_party")
    .join("ffmpeg")
    .join("bin")
    .join("ffprobe.exe")
    .to_str().unwrap().to_string()
}

// 生成缩略图
pub fn generate_thumbnail_mp4(app_handle: &AppHandle, video_path: &str, thumbnail_dir: &str) {
  println!("Generating thumbnail for {}", video_path);
  let ffmpeg_path = get_ffmpeg_path(app_handle);

  let status = Command::new(ffmpeg_path)
    .arg("-i")
    .arg(video_path)
    .arg("-vf")
    .arg("fps=1/5")
    .arg("-q:v")
    .arg("2")
    .arg(format!("{}\\{}", thumbnail_dir, "%04d.png"))
    .status()
    .map(|e| format!("启动ffmpeg.exe失败：{}", e));

  if let Ok(status) = status {
    println!("{}", status);
  }
}

// 合并视频
pub fn merge_video(app_handle: &AppHandle, merge_video_path: Vec<String>, output_path: &str) {
  let ffmpeg_path = get_ffmpeg_path(app_handle);

  // 创建文件列表文件
  let list_file = "merge_list.txt";
  let mut file = File::create(list_file).unwrap();

  for video_path in &merge_video_path {
    println!("Adding video for {}", video_path);
    // 注意：Windows 路径需要转换斜杠
    let path = video_path.replace("/", "\\");
    // 写入文件列表，格式：file '文件路径'
    writeln!(file, "file '{}'", path).unwrap();
  }

  drop(file); // 确保文件被关闭

  // 构建 ffmpeg 命令
  let _status = Command::new(ffmpeg_path)
    .args(&["-y"])
    .args(&["-f", "concat"])
    .args(&["-safe", "0"])  // 如果路径包含特殊字符，需要这个参数
    .args(&["-i", list_file])
    .args(&["-c", "copy"])  // 直接复制流，不重新编码
    .arg(output_path)
    .status()
    .map(|e| format!("执行ffmpeg.exe失败：{}", e));

  // 清理临时文件
  let _ = std::fs::remove_file(list_file);
}

pub fn get_video_duration(app_handle: &AppHandle, video_path: &str) -> Result<f64, Box<dyn std::error::Error>> {
  let ffprobe_path = get_ffprobe_path(app_handle);
  let output = Command::new(ffprobe_path)
    .args(&[
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      video_path
    ])
    .output()?;

  if output.status.success() {
    let duration_str = str::from_utf8(&output.stdout)?.trim();
    let duration: f64 = duration_str.parse()?;
    println!("current video duration is: {}", duration);
    Ok(duration)
  } else {
    let error = str::from_utf8(&output.stderr)?;
    Err(format!("FFprobe 错误: {}", error).into())
  }
}

// 将视频分割成两个
pub fn split_video_two(app_handle: &AppHandle, source_path: &str, cut_time: &str, part_one: &str, part_two: &str) -> Result<(), Box<dyn std::error::Error>> {
  let ffmpeg_path = get_ffmpeg_path(app_handle);

  println!("＜（＾－＾）＞ start to split video {}", source_path);
  println!(" part one : {}", part_one);
  println!(" part two : {}", part_two);
  println!("cut time : {}", cut_time);
  let output = Command::new(ffmpeg_path)
    .args(&["-i", source_path])      // 输入文件
    .args(&["-t", &cut_time])       // 第一部分时长
    .args(&["-c", "copy"])          // 复制编解码器
    .arg(part_one)             // 第一部分输出
    .args(&["-ss", &cut_time])     // 第二部分开始时间
    .args(&["-c", "copy"])          // 复制编解码器
    .arg(part_two)             // 第二部分输出
    .output()?;

  if output.status.success() {
    println!("✅ video split success!");
    Ok(())
  } else {
    let error_msg = String::from_utf8_lossy(&output.stderr);
    Err(format!("ffmpeg 执行失败: {}", error_msg).into())
  }
}

// 获取视频是否有音频流
pub fn has_audio(app_handle: &AppHandle, video_path: &str) -> bool {
  let ffmpeg_path = get_ffmpeg_path(app_handle);

  // 使用 -vn 测试音频流
  Command::new(ffmpeg_path)
    .args(&["-i", &video_path, "-vn", "-f", "null", "-"])
    .output()
    .map(|o| o.status.success())
    .unwrap_or(false)
}

// 提取音频
pub fn split_video_audio(app_handle: &AppHandle, video_path: &str, audio_path: &str) -> Result<(), Box<dyn std::error::Error>> {
  let ffmpeg_path = get_ffmpeg_path(app_handle);

  // ffmpeg -i input.mp4 -q:a 0 -map a output.mp3
  println!("copy video audio, video_path: {}, audio_path: {}", video_path, audio_path);
  Command::new(ffmpeg_path)
    .args(&[
      "-i", &video_path,
      "-q:a", "0",
      "-map", "a",
      &audio_path
    ])
    .output()?;
  Ok(())
}

// 获取静音视频
pub fn generate_mute_video(app_handle: &AppHandle, video_path: &str, mute_video_path: &str) -> Result<(), Box<dyn std::error::Error>> {
  let ffmpeg_path = get_ffmpeg_path(app_handle);

  // ffmpeg -i input.mp4 -an -c:v copy temp.mp4
  println!("get mute video, video_path: {}, audio_path: {}", video_path, mute_video_path);
  Command::new(ffmpeg_path)
    .args(&[
      "-i", &video_path,
      "-an",
      "-c:v", "copy",
      &mute_video_path
    ])
    .output()?;
  Ok(())
}