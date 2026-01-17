use tauri_plugin_sql::{Migration, MigrationKind};

mod ffmpeg_video;
mod context;
mod utils;
mod video;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
      .plugin(tauri_plugin_sql::Builder::new().add_migrations(context::DB_URL, vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: r#"
            CREATE TABLE IF NOT EXISTS cut_task (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                folder_name TEXT NOT NULL,
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS import_video (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cut_task_id INTEGER NOT NULL,
                import_name TEXT NOT NULL,
                original_name TEXT NOT NULL,
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS video_track (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cut_task_id INTEGER NOT NULL,
                video_name TEXT NOT NULL,
                thumbnail Text NOT NULL,
                video_time TEXT NOT NULL,
                has_audio INTEGER NOT NULL,
                display INTEGER NOT NULL
            );
        "#,
        kind: MigrationKind::Up,
      }]).build())
      .plugin(tauri_plugin_fs::init())
      .plugin(tauri_plugin_opener::init())
      .plugin(tauri_plugin_dialog::init())
      .invoke_handler(tauri::generate_handler![
          video::import_user_video,
          video::get_root_path,
          video::get_db_url,
          video::create_cut_task_workspace,
          video::add_video_in_track,
          video::get_thumbnail,
          video::synthesis_final_video,
          video::cut_video,
          video::delete_video_track,
      ])
      .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
