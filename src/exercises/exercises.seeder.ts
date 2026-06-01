import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Exercise } from './entities/exercises.entity';

@Injectable()
export class ExercisesSeeder implements OnApplicationBootstrap {
    constructor(
        @InjectModel(Exercise)
        private readonly exerciseModel: typeof Exercise,
    ) { }

    async onApplicationBootstrap() {
        await this.seedExercises();
    }

    async seedExercises() {
        const count = await this.exerciseModel.count();

        if (count > 0) {
            console.log('✅ Exercises table already has data. Skipping seed.');
            return;
        }

        console.log('🌱 Seeding diagnostic exercises data...');

        const lettersData = [
            { id: 1, letter: "أ", letterAr: "ألف", image: "assets/images/letters/1.png", soundLetter: "assets/sounds/letter_sound/alif.mp3" },
            { id: 2, letter: "ب", letterAr: "باء", image: "assets/images/letters/2.png", soundLetter: "assets/sounds/letter_sound/ba.mp3" },
            { id: 3, letter: "ت", letterAr: "تاء", image: "assets/images/letters/3.png", soundLetter: "assets/sounds/letter_sound/ta.mp3" },
            { id: 4, letter: "ث", letterAr: "ثاء", image: "assets/images/letters/4.png", soundLetter: "assets/sounds/letter_sound/tha.mp3" },
            { id: 5, letter: "ج", letterAr: "جيم", image: "assets/images/letters/5.png", soundLetter: "assets/sounds/letter_sound/jiim.mp3" },
            { id: 6, letter: "ح", letterAr: "حاء", image: "assets/images/letters/6.png", soundLetter: "assets/sounds/letter_sound/hha.mp3" },
            { id: 7, letter: "خ", letterAr: "خاء", image: "assets/images/letters/7.png", soundLetter: "assets/sounds/letter_sound/kha.mp3" },
            { id: 8, letter: "د", letterAr: "دال", image: "assets/images/letters/8.png", soundLetter: "assets/sounds/letter_sound/daal.mp3" },
            { id: 9, letter: "ذ", letterAr: "ذال", image: "assets/images/letters/9.png", soundLetter: "assets/sounds/letter_sound/thaal.mp3" },
            { id: 10, letter: "ر", letterAr: "راء", image: "assets/images/letters/10.png", soundLetter: "assets/sounds/letter_sound/ra.mp3" },
            { id: 11, letter: "ز", letterAr: "زاي", image: "assets/images/letters/11.png", soundLetter: "assets/sounds/letter_sound/zay.mp3" },
            { id: 12, letter: "س", letterAr: "سين", image: "assets/images/letters/12.png", soundLetter: "assets/sounds/letter_sound/siin.mp3" },
            { id: 13, letter: "ش", letterAr: "شين", image: "assets/images/letters/13.png", soundLetter: "assets/sounds/letter_sound/shiin.mp3" },
            { id: 14, letter: "ص", letterAr: "صاد", image: "assets/images/letters/14.png", soundLetter: "assets/sounds/letter_sound/saad.mp3" },
            { id: 15, letter: "ض", letterAr: "ضاد", image: "assets/images/letters/15.png", soundLetter: "assets/sounds/letter_sound/daad.mp3" },
            { id: 16, letter: "ط", letterAr: "طاء", image: "assets/images/letters/16.png", soundLetter: "assets/sounds/letter_sound/taa.mp3" },
            { id: 17, letter: "ظ", letterAr: "ظاء", image: "assets/images/letters/17.png", soundLetter: "assets/sounds/letter_sound/thaa.mp3" },
            { id: 18, letter: "ع", letterAr: "عين", image: "assets/images/letters/18.png", soundLetter: "assets/sounds/letter_sound/ayn.mp3" },
            { id: 19, letter: "غ", letterAr: "غين", image: "assets/images/letters/19.png", soundLetter: "assets/sounds/letter_sound/ghayn.mp3" },
            { id: 20, letter: "ف", letterAr: "فاء", image: "assets/images/letters/20.png", soundLetter: "assets/sounds/letter_sound/fa.mp3" },
            { id: 21, letter: "ق", letterAr: "قاف", image: "assets/images/letters/21.png", soundLetter: "assets/sounds/letter_sound/qaf.mp3" },
            { id: 22, letter: "ك", letterAr: "كاف", image: "assets/images/letters/22.png", soundLetter: "assets/sounds/letter_sound/kaf.mp3" },
            { id: 23, letter: "ل", letterAr: "لام", image: "assets/images/letters/23.png", soundLetter: "assets/sounds/letter_sound/lam.mp3" },
            { id: 24, letter: "م", letterAr: "ميم", image: "assets/images/letters/24.png", soundLetter: "assets/sounds/letter_sound/miim.mp3" },
            { id: 25, letter: "ن", letterAr: "نون", image: "assets/images/letters/25.png", soundLetter: "assets/sounds/letter_sound/nuun.mp3" },
            { id: 26, letter: "ه", letterAr: "هاء", image: "assets/images/letters/26.png", soundLetter: "assets/sounds/letter_sound/ha.mp3" },
            { id: 27, letter: "و", letterAr: "واو", image: "assets/images/letters/27.png", soundLetter: "assets/sounds/letter_sound/waw.mp3" },
            { id: 28, letter: "ي", letterAr: "ياء", image: "assets/images/letters/28.png", soundLetter: "assets/sounds/letter_sound/ya.mp3" },
        ];

        const level7Words = [
            'أرنب', 'برتقالة', 'تفاحة', 'ثلج', 'جزر', 'حذاء', 'خضار', 'دب', 'ذرة', 'رمان',
            'زهرة', 'سمكة', 'شمس', 'صندوق', 'ضرس', 'طماطم', 'ظرف', 'عصفورة', 'غيوم', 'فجل',
            'قلم', 'كتاب', 'لمون', 'منطاد', 'نحلة', 'هرة', 'ورق', 'يد'
        ];

        const exercisesToInsert = [];

        // ----------------------------------------------------
        // ليفل 1: سمع ونطق الحروف (28 تمرين - نوع speech)
        // ----------------------------------------------------
        lettersData.forEach((item) => {
            exercisesToInsert.push({
                title: `سماع ونطق حرف ${item.letterAr}`,
                type: 'speech',
                content: item.letter,
                imageUrl: item.image,
                audioUrl: item.soundLetter,
                level: '1',
            });
        });

        // ----------------------------------------------------
        // ليفل 2: حروف المد (الألف، الواو، الياء)
        // ----------------------------------------------------
        const maddLetters = [
            { letter: "ا", letterAr: "الألف", image: "assets/images/letters/1.png", sound: "assets/sounds/letter_sound/alif.mp3" },
            { letter: "و", letterAr: "الواو", image: "assets/images/letters/27.png", sound: "assets/sounds/letter_sound/waw.mp3" },
            { letter: "ي", letterAr: "الياء", image: "assets/images/letters/28.png", sound: "assets/sounds/letter_sound/ya.mp3" },
        ];
        maddLetters.forEach((item) => {
            exercisesToInsert.push({
                title: `حروف المد: مد بال${item.letterAr}`,
                type: 'reading',
                content: item.letter,
                imageUrl: item.image,
                audioUrl: item.sound,
                level: '2',
            });
        });

        // ----------------------------------------------------
        // ليفل 3 & ليفل 4: قراءة كلمات عادية (تمارين عامة للقرأة)
        // ----------------------------------------------------
        const readingExercisesLevel3 = ['قَطُّ', 'بَيْتٌ', 'وَلَدٌ', 'شَجَرَةٌ'];
        readingExercisesLevel3.forEach((word, index) => {
            exercisesToInsert.push({
                title: `قراءة كلمة عادية - تمرين ${index + 1}`,
                type: 'reading',
                content: word,
                imageUrl: `assets/images/reading/level3_${index + 1}.png`,
                audioUrl: `assets/sounds/reading/level3_${index + 1}.mp3`,
                level: '3',
            });
        });

        const readingExercisesLevel4 = ['كِتَابٌ', 'مَدْرَسَةٌ', 'قَلَمٌ', 'زَهْرَةٌ'];
        readingExercisesLevel4.forEach((word, index) => {
            exercisesToInsert.push({
                title: `قراءة وتحليل كلمة - تمرين ${index + 1}`,
                type: 'reading',
                content: word,
                imageUrl: `assets/images/reading/level4_${index + 1}.png`,
                audioUrl: `assets/sounds/reading/level4_${index + 1}.mp3`,
                level: '4',
            });
        });

        // ----------------------------------------------------
        // ليفل 5: يكتب الحروف (28 تمرين بالترتيب - نوع handwriting)
        // ----------------------------------------------------
        lettersData.forEach((item) => {
            exercisesToInsert.push({
                title: `كتابة حرف ${item.letterAr}`,
                type: 'handwriting',
                content: item.letter,
                imageUrl: item.image,
                audioUrl: item.soundLetter,
                level: '5',
            });
        });

        // ----------------------------------------------------
        // ليفل 6: نطق جملة (جملة واحدة - نوع speech)
        // ----------------------------------------------------
        exercisesToInsert.push({
            title: 'نطق جملة صحيحة',
            type: 'speech',
            content: 'أَنَا أُحِبُّ اللُّغَةَ الْعَرَبِيَّةَ',
            imageUrl: 'assets/images/levels/level6.png',
            audioUrl: 'assets/sounds/sentences/love_arabic.mp3',
            level: '6',
        });

        // ----------------------------------------------------
        // ليفل 7: يكتب كلمات (28 تمرين لكل الحروف بالترتيب - نوع handwriting)
        // ----------------------------------------------------
        lettersData.forEach((item, index) => {
            exercisesToInsert.push({
                title: `كتابة كلمة تبدأ بحرف ${item.letterAr}`,
                type: 'handwriting',
                content: level7Words[index], // هنا بنسحب الكلمة المقابلة بالظبط بالترتيب (مثال: أرنب للألف، برتقالة للباء...)
                imageUrl: `assets/images/words/${index + 1}.png`, // منظمة أوتوماتيكياً بناء على الـ ID
                audioUrl: `assets/sounds/words/${index + 1}.mp3`,
                level: '7',
            });
        });

        try {
            await this.exerciseModel.bulkCreate(exercisesToInsert);
            console.log(`✅ All exercises for the 7 levels seeded successfully! Total: ${exercisesToInsert.length}`);
        } catch (error) {
            console.error('❌ Error seeding exercises:', error);
        }
    }
}