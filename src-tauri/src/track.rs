use std::fs;
use tauri::AppHandle;
use crate::{context, ffmpeg_video};

#[tauri::command]
pub fn split_video_audio(app_handle: AppHandle, workspace: &str, track_name: &str, pure_track_name: &str) -> String {
  split_audio(app_handle, workspace, track_name, pure_track_name).unwrap_or_else(|e| {
    println!("Failed to split video audio: {}", e);
    String::from("500")
  })
}

fn split_audio(app_handle: AppHandle, workspace: &str, track_name: &str, pure_track_name: &str) -> Result<String, Box<dyn std::error::Error>> {
  let video_track_dir = std::path::Path::new(context::DEFAULT_URL).join(workspace).join("videoTrack");
  // 提取音频
  let video_track_file = video_track_dir.join(track_name);
  let audio_name = format!("{}.mp3", pure_track_name);
  let audio_file = video_track_dir.join(&audio_name);
  println!("Splitting video audio: {}", video_track_dir.display());
  ffmpeg_video::split_video_audio(&app_handle, video_track_file.to_str().unwrap(), audio_file.to_str().unwrap())?;

  // 去除视频音频流
  let temp_mut_video = video_track_dir.join("temp.mp4");
  ffmpeg_video::generate_mute_video(&app_handle, video_track_file.to_str().unwrap(), temp_mut_video.to_str().unwrap())?;

  // 删除当前有声视频
  fs::remove_file(video_track_file.clone())?;
  // 无声视频更名为当前视频
  fs::rename(temp_mut_video, video_track_file)?;
  Ok(audio_name)
}