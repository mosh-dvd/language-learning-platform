# אפליקציה עצמאית - Language Learning Platform

האפליקציה הומרה לאפליקציית שולחן עבודה עם Electron.

## דרישות מערכת

**חובה:**
- PostgreSQL 12 ומעלה
- Node.js 18 ומעלה

## הגדרה ראשונית (פעם אחת)

### 1. התקן PostgreSQL
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. צור בסיס נתונים
```bash
sudo -u postgres psql
CREATE DATABASE language_learning;
CREATE USER language_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE language_learning TO language_user;
\q
```

### 3. הגדר את ה-backend
צור קובץ `backend/.env`:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=language_learning
DB_USER=language_user
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key
PORT=3000
NODE_ENV=production
```

### 4. הרץ מיגרציות
```bash
cd backend
npm install
npm run migrate
cd ..
```

## הרצת האפליקציה

### שלב 1: הרץ את ה-Backend
בטרמינל אחד:
```bash
cd backend
npm start
```

ה-backend ירוץ על פורט 3000.

### שלב 2: פתח את האפליקציה

**מצב פיתוח:**
```bash
npm start
```

**AppImage (production):**
```bash
chmod +x "dist-electron/Language Learning Platform-1.0.0.AppImage"
./dist-electron/Language\ Learning\ Platform-1.0.0.AppImage
```

**DEB (production):**
```bash
sudo dpkg -i dist-electron/language-learning-platform_1.0.0_amd64.deb
# ואז פתח מהתפריט
```

האפליקציה תיפתח ותתחבר ל-backend על http://localhost:3000

## בניית האפליקציה

```bash
npm run build:electron:linux
```

יוצר:
- `Language Learning Platform-1.0.0.AppImage` - קובץ להרצה ישירה
- `language-learning-platform_1.0.0_amd64.deb` - חבילת התקנה

## איך זה עובד?

1. **Backend:** רץ בנפרד על פורט 3000 (צריך להריץ ידנית)
2. **Frontend:** ארוז בתוך Electron, מתחבר ל-backend
3. **Desktop App:** חלון Electron שמציג את הממשק

**יתרון:** אפשר להריץ את ה-backend על שרת מרוחק ולהתחבר אליו מכמה מחשבים.

## מבנה הפרויקט

```
.
├── electron/           # קבצי Electron
│   ├── main.js        # תהליך ראשי של Electron
│   └── preload.js     # Preload script
├── frontend/          # React frontend
├── backend/           # Node.js backend
└── package.json       # הגדרות Electron
```

## יתרונות של Desktop App עצמאית

1. **עצמאות מלאה** - לא צריך להריץ backend בנפרד
2. **התקנה פשוטה** - קובץ אחד מכיל הכל
3. **ביצועים** - הכל רץ מקומית על המחשב
4. **פרטיות** - כל הנתונים נשמרים מקומית
5. **אין תלות באינטרנט** - עובד לחלוטין offline (מלבד speech recognition)
6. **קל להפצה** - פשוט לשתף את קובץ ה-AppImage/DEB

## דרישות מערכת למשתמש קצה

המשתמש צריך רק:
- PostgreSQL מותקן ומוגדר
- קובץ `.env` עם הגדרות חיבור לבסיס נתונים
- הרצת מיגרציות פעם אחת

**זהו! אין צורך ב-Node.js או כלי פיתוח אחרים.**

## הערות

- במצב פיתוח, האפליקציה תיפתח עם DevTools
- במצב ייצור, האפליקציה תיפתח ללא DevTools
- ה-Backend רץ בפורט 3000
- ה-Frontend רץ בפורט 5174 (במצב פיתוח)
- ב-Linux, Electron רץ עם `--no-sandbox` (בטוח במצב פיתוח)

## פתרון בעיות

### האפליקציה לא נפתחת
1. ודא ש-PostgreSQL רץ: `sudo systemctl status postgresql`
2. בדוק את קובץ ה-`.env` בתיקיית backend
3. ודא שהפורט 3000 פנוי: `sudo lsof -i :3000`
4. בדוק את הלוגים בטרמינל (אם הרצת מהטרמינל)

### שגיאות חיבור לבסיס נתונים
1. בדוק שבסיס הנתונים קיים: `sudo -u postgres psql -l`
2. ודא שהסיסמה נכונה בקובץ `.env`
3. בדוק הרשאות: `sudo -u postgres psql -c "\du"`

### ה-backend לא מתחיל
1. הרץ את המיגרציות: `cd backend && npm run migrate`
2. בדוק שכל ה-dependencies מותקנים: `cd backend && npm install`
3. נסה להריץ את ה-backend ידנית: `cd backend && npm run dev`

### שגיאות בבניה
אם יש שגיאות TypeScript:
```bash
cd backend
npm run build:check
```
לבדיקה מלאה.

## מה הלאה?

1. **הוסף תוכן** - צור שיעורים ותרגילים דרך ממשק הניהול
2. **התאם אישית** - הוסף אייקון משלך (ראה `frontend/public/icon-info.md`)
3. **בנה להפצה** - הרץ `npm run build:electron:linux` ליצירת קובץ התקנה
