# התחלה מהירה - אפליקציה עצמאית

## הכנה (פעם אחת)

### 1. התקן PostgreSQL
```bash
sudo apt install postgresql
sudo systemctl start postgresql
```

### 2. צור בסיס נתונים
```bash
sudo -u postgres psql
CREATE DATABASE language_learning;
CREATE USER language_user WITH PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE language_learning TO language_user;
\q
```

### 3. הגדר את ה-backend
צור קובץ `backend/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=language_learning
DB_USER=language_user
DB_PASSWORD=mypassword
JWT_SECRET=change-this-secret-key
PORT=3000
```

### 4. הרץ מיגרציות
```bash
cd backend
npm install
npm run migrate
cd ..
```

## בניית האפליקציה

```bash
npm run build:electron:linux
```

זה ייצור:
- `dist-electron/Language Learning Platform-1.0.0.AppImage` (112MB)
- `dist-electron/language-learning-platform_1.0.0_amd64.deb` (88MB)

## הרצה

### AppImage
```bash
chmod +x "dist-electron/Language Learning Platform-1.0.0.AppImage"
./dist-electron/Language\ Learning\ Platform-1.0.0.AppImage
```

### DEB
```bash
sudo dpkg -i dist-electron/language-learning-platform_1.0.0_amd64.deb
```

## מה קורה כשפותחים את האפליקציה?

1. Electron מתחיל
2. ה-backend מתחיל אוטומטית (Node.js server על פורט 3000)
3. ה-backend מתחבר ל-PostgreSQL
4. הממשק נטען ומתחבר ל-backend
5. האפליקציה מוכנה לשימוש!

כשסוגרים את האפליקציה, ה-backend נסגר אוטומטית.

## הערות

- האפליקציה כוללת את כל הקוד וה-dependencies
- דורשת רק PostgreSQL מותקן במערכת
- עובדת לחלוטין offline (מלבד speech recognition)
- כל הנתונים נשמרים מקומית
