# אפליקציה עצמאית - Language Learning Platform

האפליקציה עכשיו עצמאית לחלוטין! ה-backend רץ אוטומטית כשפותחים את האפליקציה.

## דרישות מערכת

לפני שמריצים את האפליקציה, צריך להתקין:

### 1. PostgreSQL
האפליקציה משתמשת ב-PostgreSQL לאחסון נתונים.

**התקנה ב-Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**יצירת בסיס נתונים:**
```bash
sudo -u postgres psql
```

בתוך psql:
```sql
CREATE DATABASE language_learning;
CREATE USER language_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE language_learning TO language_user;
\q
```

### 2. Node.js (רק אם מריצים מקוד מקור)
אם אתה מריץ את האפליקציה מקוד מקור (לא מקובץ AppImage/deb), צריך Node.js 18+:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

## הגדרת משתני סביבה

צור קובץ `.env` בתיקיית `backend/`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=language_learning
DB_USER=language_user
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server
PORT=3000
NODE_ENV=production

# Redis (אופציונלי - לקאש)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## הרצת המיגרציות

לפני הרצה ראשונה, צריך ליצור את הטבלאות בבסיס הנתונים:

```bash
cd backend
npm install
npm run migrate
```

## הרצת האפליקציה

### מצב פיתוח (מקוד מקור)
```bash
npm start
```
זה יריץ את ה-backend והחלון של Electron.

### מצב ייצור (AppImage)
```bash
chmod +x "Language Learning Platform-1.0.0.AppImage"
./Language\ Learning\ Platform-1.0.0.AppImage
```

### מצב ייצור (DEB)
```bash
sudo dpkg -i language-learning-platform_1.0.0_amd64.deb
```
ואז פשוט פתח את האפליקציה מהתפריט.

## איך זה עובד?

1. כשפותחים את האפליקציה, Electron מריץ אוטומטית את ה-backend server
2. ה-backend מתחבר ל-PostgreSQL ומאזין על פורט 3000
3. הממשק (frontend) נטען ומתחבר ל-backend
4. כשסוגרים את האפליקציה, ה-backend נסגר אוטומטית

## פתרון בעיות

### האפליקציה לא נפתחת
1. ודא ש-PostgreSQL רץ: `sudo systemctl status postgresql`
2. בדוק שבסיס הנתונים קיים: `sudo -u postgres psql -l`
3. ודא שהפורט 3000 פנוי: `sudo lsof -i :3000`

### שגיאות חיבור לבסיס נתונים
1. בדוק את הגדרות ה-`.env`
2. ודא שהסיסמה נכונה
3. בדוק שהמשתמש יש לו הרשאות: `sudo -u postgres psql -c "\du"`

### ה-backend לא מתחיל
1. בדוק את הלוגים בטרמינל
2. ודא שכל ה-dependencies מותקנים: `cd backend && npm install`
3. הרץ את המיגרציות: `npm run migrate`

## בניית האפליקציה מחדש

אם עשית שינויים בקוד:

```bash
# בנה את הכל
npm run build

# בנה AppImage ו-DEB ל-Linux
npm run build:electron:linux

# בנה ל-Windows (דורש Wine)
npm run build:electron:win

# בנה ל-macOS (רק על Mac)
npm run build:electron:mac
```

## מה הלאה?

1. **הוסף תוכן** - צור שיעורים ותרגילים דרך ממשק הניהול
2. **התאם אישית** - שנה את האייקון ב-`frontend/public/`
3. **הפץ** - שתף את קובץ ה-AppImage או ה-DEB עם אחרים

## הערות חשובות

- האפליקציה דורשת PostgreSQL מותקן במערכת
- בגרסת ייצור, ה-backend רץ בתוך האפליקציה
- כל הנתונים נשמרים מקומית במחשב
- אין צורך בחיבור לאינטרנט (מלבד תכונות speech recognition)
