CREATE TABLE IF NOT EXISTS cut_task (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_name TEXT NOT NULL,
    create_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_video (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cut_task_id INTEGER NOT NULL,
    import_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    create_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS test (
                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                            cut_task_id INTEGER NOT NULL,
                                            import_name TEXT NOT NULL,
                                            original_name TEXT NOT NULL,
                                            create_time TEXT NOT NULL
);

REPLACE INTO cut_task(folder_name, create_time) values ("123sasa", "dsdssdd");