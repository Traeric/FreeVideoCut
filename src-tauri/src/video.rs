use crate::{ffmpeg_video, utils};
use crate::context;
use std::fs;
use tauri::{AppHandle};

fn create_cut_task(folder_name: &str) {
    // 创建剪辑任务
    let mut default_dir = context::DEFAULT_URL.to_string();
    // 获取应用专属目录
    default_dir.push_str(folder_name);

    let _ = fs::create_dir_all(default_dir.as_str());
}

/**
 * 导入视频
 */
fn import_video(import_path: &str, folder_name: &str) -> String {
    // 复制上传的视频到剪辑目录
    let mut dest_path = context::DEFAULT_URL.to_string();
    dest_path.push_str(folder_name);

    // 创建import目录
    dest_path.push_str("\\import\\");
    fs::create_dir_all(dest_path.as_str()).unwrap();

    let now = utils::get_current_timestamp_millis();
    let original_name = import_path.split("\\").last().unwrap();
    let file_type = original_name.split('.').last().unwrap();
    let import_name = format!("imported_{}.{}", now, file_type);
    dest_path.push_str(import_name.as_str());

    println!("Current workspace: {}", dest_path);
    utils::copy_file(import_path, dest_path.as_str());

    import_name.clone()
}

fn generate_thumbnail(app_handle: &AppHandle, video_path: &str, thumbnail_dir: String) {
    println!("Generating thumbnail..., dir: {}", thumbnail_dir);
    if let Ok(()) = fs::create_dir_all(thumbnail_dir.clone()) {
        ffmpeg_video::generate_thumbnail_mp4(app_handle, video_path, &thumbnail_dir);
    }
}

#[tauri::command]
pub fn get_root_path() -> String {
    context::DEFAULT_URL.to_string()
}

#[tauri::command]
pub fn import_user_video(import_path: &str, folder_name: &str) -> String {
    import_video(import_path, folder_name)
}

#[tauri::command]
pub fn get_db_url() -> String {
    context::DB_URL.to_string()
}

#[tauri::command]
pub fn create_cut_task_workspace(folder_name: &str) {
    println!("Workspace created: {}", folder_name);
    create_cut_task(folder_name);
}

/**
 * 将视频添加到轨道中
 */
#[tauri::command]
pub fn add_video_in_track(app_handle: AppHandle, workspace: &str, import_name: &str) -> (String, f64, bool) {
    let mut workspace_path = context::DEFAULT_URL.to_string();
    workspace_path.push_str(workspace);

    // 获取视频轨道目录
    let mut video_track_path = workspace_path.clone();
    video_track_path.push_str("//videoTrack//");

    // 创建视频轨道目录
    fs::create_dir_all(video_track_path.as_str()).unwrap();

    // 复制视频
    let mut src_path = workspace_path.clone();
    src_path.push_str(format!("//import//{}", import_name).as_str());

    let mut dest_path = video_track_path;
    let track_video_name_suffix = utils::get_current_timestamp_millis().to_string();
    // 创建缩略图目录
    let mut thumbnail_dir = dest_path.clone();
    thumbnail_dir.push_str(&track_video_name_suffix);
    fs::create_dir_all(&thumbnail_dir).unwrap();

    // 复制文件到轨道目录
    let track_video_name = format!("{}.mp4", track_video_name_suffix);
    dest_path.push_str(track_video_name.as_str());
    utils::copy_file(src_path.as_str(), dest_path.as_str());

    // 获取视频时长
    let mut video_time: f64 = 0.0;
    if let Ok(time) = ffmpeg_video::get_video_duration(&app_handle, &dest_path) {
        video_time = time;
    }

    // 判断视频是否包含音频流
    let has_audio = ffmpeg_video::has_audio(&app_handle, &dest_path);

    // 生成视频缩略图
    std::thread::spawn(move || {
        generate_thumbnail(&app_handle, dest_path.as_str(), thumbnail_dir);
    });

    (track_video_name_suffix, video_time, has_audio)
}

#[tauri::command]
pub fn get_thumbnail(workspace: &str, thumbnail: &str) -> Vec<String> {
    println!("Thumbnail: {} work {}", thumbnail, workspace);
    let thumbnail_dir = std::path::Path::new(context::DEFAULT_URL);
    let thumbnail_dir = thumbnail_dir.join(workspace).join("videoTrack").join(thumbnail);

    // 获取该目录下所有的缩略图
    println!("Thumbnail dir: {}", thumbnail_dir.to_str().unwrap());
    let mut thumbnail_list = vec![];
    for entry in fs::read_dir(thumbnail_dir.clone()).unwrap() {
        if let Ok(entry) = entry {
            let item = format!("{}/{}", thumbnail_dir.to_str().unwrap(), entry.file_name().into_string().unwrap());
            thumbnail_list.push(item);
        }
    }
    println!("generate thumbnail success: {}", thumbnail_list.len());

    thumbnail_list
}

#[tauri::command]
pub fn synthesis_final_video(app_handle: AppHandle, workspace: &str, video_track_list: Vec<String>) -> String {
    if let Ok(file_video_name) = synthesis_video(app_handle, workspace, video_track_list) {
        file_video_name
    } else {
        String::from("bad path")
    }
}

fn synthesis_video(app_handle: AppHandle, workspace: &str, video_track_list: Vec<String>) -> Result<String, std::io::Error> {
    let final_video_path = std::path::Path::new(context::DEFAULT_URL);
    let final_video_path = final_video_path.join(workspace).join("final_video");

    // 创建目录
    fs::create_dir_all(final_video_path.clone())?;

    // 获取待生成的视频路径
    let mut video_track_dirs: Vec<String> = vec![];
    for item in video_track_list {
        let cur_path = std::path::Path::new(context::DEFAULT_URL)
          .join(workspace).join("videoTrack").join(item);
        video_track_dirs.push(cur_path.to_str().unwrap().to_string());
    }

    // 获取最终视频路径
    let final_video_name = format!("{}.mp4", utils::get_current_timestamp_millis());
    // 去除当前生成的视频
    for entry in fs::read_dir(final_video_path.clone())? {
        fs::remove_file(&entry?.path())?;
    }

    let temp_final_video_name = final_video_name.clone();
    std::thread::spawn(move || {
        ffmpeg_video::merge_video(
            &app_handle,
            video_track_dirs,
            final_video_path.join(&temp_final_video_name).to_str().unwrap()
        );

        // 合并完成写入一个标记文件
        match fs::write(final_video_path.join("ok.txt"), "file generate success") {
            Ok(_) => (),
            Err(error) => println!("flag file write Error: {}", error),
        }
    });
    Ok(final_video_name)
}

#[tauri::command]
pub fn cut_video(app_handle: AppHandle, workspace: &str, cut_video_name: &str, thumbnail: &str, cut_time: &str) -> (String, String) {
    // 获取视频路径
    let track_video_path = std::path::Path::new(context::DEFAULT_URL)
      .join(workspace).join("videoTrack");

    let source_video_path = track_video_path.clone().join(cut_video_name);

    // 生成要生成的视频路径
    let video_fist_name = utils::get_current_timestamp_millis().to_string();
    let video_second_name = (utils::get_current_timestamp_millis() + 1).to_string();
    let video_first_path = track_video_path.clone().join(format!("{}.mp4", video_fist_name));
    let video_second_path = track_video_path.clone().join(format!("{}.mp4", video_second_name));

    if let Ok(()) = ffmpeg_video::split_video_two(
        &app_handle,
        source_video_path.to_str().unwrap(),
        cut_time,
        video_first_path.to_str().unwrap(),
        video_second_path.to_str().unwrap()
    ) {
        // 删除原视频
        let thumbnail_path = track_video_path.clone().join(thumbnail);
        println!("remove file: {}, thumbnail: {}", source_video_path.to_str().unwrap(), thumbnail_path.to_str().unwrap());
        let _ = fs::remove_file(source_video_path);
        let _ = fs::remove_dir_all(thumbnail_path);

        // 生成缩略图
        let first_value = video_fist_name.clone();
        let second_value = video_second_name.clone();
        std::thread::spawn(move || {
            println!("generate split Thumbnail dir");
            let part_one_thumbnail = String::from(track_video_path.clone().join(&first_value).to_str().unwrap());
            let part_two_thumbnail = String::from(track_video_path.clone().join(&second_value).to_str().unwrap());
            generate_thumbnail(&app_handle, video_first_path.to_str().unwrap(), part_one_thumbnail);
            generate_thumbnail(&app_handle, video_second_path.to_str().unwrap(), part_two_thumbnail);
        });
    } else {
        panic!("split video failed");
    }

    (video_fist_name, video_second_name)
}

#[tauri::command]
pub fn delete_video_track(workspace: &str, video_track_name: &str, thumbnail: &str) {
    match remove_video_track(workspace, video_track_name, thumbnail) {
        Ok(()) => {
            println!("removed video track");
        },
        Err(e) => {
            println!("Error removing video track: {}", e);
        }
    }
}

fn remove_video_track(workspace: &str, video_track_name: &str, thumbnail: &str) -> Result<(), std::io::Error> {
    // 删除对应的视频文件以及缩略图
    let video_track_path = std::path::Path::new(context::DEFAULT_URL).join(workspace).join("videoTrack");
    println!("remove video track path: {}, video: {}, thumbnail: {}", video_track_path.to_str().unwrap(), video_track_name, thumbnail);
    fs::remove_file(video_track_path.join(video_track_name))?;
    fs::remove_dir_all(video_track_path.join(thumbnail))?;

    Ok(())
}

#[tauri::command]
pub fn get_final_video_path(workspace: &str, video_name: &str) -> String {
    let final_video_dir = std::path::Path::new(context::DEFAULT_URL)
      .join(workspace)
      .join("final_video");

    println!("judge final video path: {:?}", final_video_dir);
    let flag_file = final_video_dir.join("ok.txt");
    if flag_file.exists() {
        final_video_dir.join(video_name).to_str().unwrap().to_string()
    } else {
        String::from("")
    }
}
