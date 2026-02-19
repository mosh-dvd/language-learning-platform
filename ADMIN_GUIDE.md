# מדריך ממשק הניהול - הוספת שיעורים

## איך להגיע לממשק הניהול

1. התחבר לאפליקציה עם המשתמש שלך
2. לחץ על "ניהול שיעורים" בתפריט העליון
3. תגיע לדף ניהול השיעורים

## איך ליצור שיעור חדש

### שלב 1: פרטי השיעור הבסיסיים

1. **כותרת השיעור**: הזן שם לשיעור (לדוגמה: "ברכות בסיסיות")
2. **שפת היעד**: בחר את השפה שהתלמידים ילמדו (לדוגמה: English)
3. לחץ על "Add Exercise" כדי להוסיף תרגיל

### שלב 2: הוספת תרגילים

כל תרגיל צריך:

1. **תמונה**: העלה תמונה או בחר תמונה קיימת
   - לחץ על "Choose Image" 
   - העלה קובץ תמונה מהמחשב שלך
   
2. **סוג התרגיל**: בחר את סוג התרגיל:
   - **Image with Text**: תמונה עם טקסט (הכי פשוט להתחלה)
   - **Matching Pairs**: התאמת זוגות
   - **Fill in the Blank**: השלמת משפט
   - **Listening Comprehension**: הבנת הנשמע

3. **סדר התרגילים**: אפשר לגרור ולשחרר תרגילים כדי לשנות את הסדר

### שלב 3: שמירה ופרסום

1. **שמירה**: לחץ על "Save Lesson" כדי לשמור את השיעור (טיוטה)
2. **פרסום**: לחץ על "Publish" כדי לפרסם את השיעור ולהפוך אותו זמין לתלמידים

## דוגמה: יצירת שיעור "ברכות בסיסיות"

```
כותרת: Basic Greetings
שפת יעד: English

תרגיל 1:
- תמונה: תמונה של אנשים מברכים זה את זה
- סוג: Image with Text
- טקסט: Hello

תרגיל 2:
- תמונה: תמונה של אנשים נפרדים
- סוג: Image with Text
- טקסט: Goodbye

תרגיל 3:
- תמונה: תמונה של מישהו אומר תודה
- סוג: Image with Text
- טקסט: Thank you
```

## שימוש ב-API ישירות (מתקדם)

אם אתה מעדיף להשתמש ב-API ישירות או ליצור סקריפט, יש לך גישה ל-Swagger UI:

1. פתח דפדפן וגש ל: `http://localhost:3000/api-docs`
2. תראה את כל ה-endpoints הזמינים
3. תוכל לבדוק ולהריץ בקשות ישירות מהדפדפן

### דוגמה: יצירת שיעור דרך API

```bash
# 1. צור שיעור חדש
curl -X POST http://localhost:3000/api/lessons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Basic Greetings",
    "targetLanguage": "en",
    "createdBy": "YOUR_USER_ID"
  }'

# 2. העלה תמונה
curl -X POST http://localhost:3000/api/images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"

# 3. הוסף טקסט לתמונה
curl -X POST http://localhost:3000/api/image-texts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "imageId": "IMAGE_ID",
    "languageCode": "en",
    "text": "Hello"
  }'

# 4. צור תרגיל
curl -X POST http://localhost:3000/api/exercises \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "lessonId": "LESSON_ID",
    "imageId": "IMAGE_ID",
    "exerciseType": "image_text",
    "orderIndex": 1
  }'

# 5. פרסם את השיעור
curl -X PUT http://localhost:3000/api/lessons/LESSON_ID/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## שימוש בסקריפט (הכי קל)

אם אתה רוצה ליצור הרבה שיעורים במהירות, תוכל להשתמש בסקריפט:

```bash
cd backend
npm run seed-lessons
```

הסקריפט נמצא ב: `backend/src/scripts/seed-lessons.ts`

אתה יכול לערוך אותו ולהוסיף שיעורים נוספים.

## טיפים

1. **התחל פשוט**: צור שיעור עם 3-5 תרגילים פשוטים מסוג "Image with Text"
2. **בדוק לפני פרסום**: שמור את השיעור כטיוטה ובדוק אותו לפני הפרסום
3. **השתמש בתמונות איכותיות**: תמונות ברורות עוזרות ללמידה
4. **סדר לוגי**: סדר את התרגילים מהקל לקשה

## בעיות נפוצות

### "Lesson must have at least one exercise"
- וודא שהוספת לפחות תרגיל אחד לשיעור

### "Exercise must have an image"
- כל תרגיל חייב להכיל תמונה

### "Failed to save lesson"
- בדוק שאתה מחובר למערכת
- בדוק שהשרת רץ (http://localhost:3000)
