import pool from '../db/pool.js';

async function seedLessons() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting to seed lessons...');
    
    // Create a demo lesson for English
    const lessonResult = await client.query(`
      INSERT INTO lessons (title, target_language, published)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['Basic Greetings', 'en', true]);
    
    const lessonId = lessonResult.rows[0].id;
    console.log(`✅ Created lesson: Basic Greetings (${lessonId})`);
    
    // Create some demo images with texts
    const words = [
      { text: 'Hello', hebrew: 'שלום' },
      { text: 'Goodbye', hebrew: 'להתראות' },
      { text: 'Thank you', hebrew: 'תודה' },
      { text: 'Please', hebrew: 'בבקשה' },
      { text: 'Yes', hebrew: 'כן' },
      { text: 'No', hebrew: 'לא' }
    ];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Create a dummy image entry
      const imageResult = await client.query(`
        INSERT INTO images (filename, storage_path, mime_type, size_bytes)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [`${word.text.toLowerCase()}.png`, `/images/${word.text.toLowerCase()}.png`, 'image/png', 1024]);
      
      const imageId = imageResult.rows[0].id;
      
      // Add English text
      await client.query(`
        INSERT INTO image_texts (image_id, language_code, text)
        VALUES ($1, $2, $3)
      `, [imageId, 'en', word.text]);
      
      // Add Hebrew text
      await client.query(`
        INSERT INTO image_texts (image_id, language_code, text)
        VALUES ($1, $2, $3)
      `, [imageId, 'he', word.hebrew]);
      
      // Create exercise
      await client.query(`
        INSERT INTO exercises (lesson_id, image_id, order_index)
        VALUES ($1, $2, $3)
      `, [lessonId, imageId, i + 1]);
      
      console.log(`✅ Created exercise ${i + 1}: ${word.text} / ${word.hebrew}`);
    }
    
    await client.query('COMMIT');
    console.log('🎉 Successfully seeded lessons!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding lessons:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed function
seedLessons()
  .then(() => {
    console.log('✨ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
