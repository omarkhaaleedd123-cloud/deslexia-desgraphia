import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubmissionProvider } from '../providers/submission.provider';
import { CreateSubmissionDto } from '../dto/create-submission.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Child } from '../../child/entities/child.entity';
import { Exercise } from 'src/exercises/entities/exercises.entity';

@Injectable()
export class SubmissionService {
  constructor(
    private readonly submissionProvider: SubmissionProvider,

    @InjectModel(Child)
    private readonly childModel: typeof Child,

    @InjectModel(Exercise)
    private readonly exerciseModel: typeof Exercise
  ) { }

  // CREATE
  async create(dto: CreateSubmissionDto, parentId: number) {
    // 1. التأكد من وجود الطفل
    const child = await this.childModel.findByPk(dto.childId);

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // 2. التأكد من صلاحية الوالد
    if (Number(child.parentId) !== Number(parentId)) {
      throw new ForbiddenException('You cannot add data to this child');
    }

    // 3. 🌟 التحقق من أن الـ exerciseId يقع في النطاق من 1 إلى 28
    const exerciseIdNum = Number(dto.exerciseId);
    if (isNaN(exerciseIdNum) || exerciseIdNum < 1 || exerciseIdNum > 28) {
      throw new BadRequestException('Invalid exercise ID. Must be between 1 and 28');
    }

    // 4. 🌟 التأكد من وجود التمرين فعلياً في قاعدة البيانات
    const exercise = await this.exerciseModel.findByPk(dto.exerciseId);
    if (!exercise) {
      throw new NotFoundException(`Exercise with ID ${dto.exerciseId} does not exist`);
    }

    // 🌟 المنطق الخاص بكِ: طالما فيه أخطاء مبعوتة، صلحها واستنتج الحرف فوراً بغض النظر عن الـ status
    if (dto.mistakes && dto.mistakes.length > 0) {
      let targetLetter = '';
      const cleanContent = exercise.content.trim();

      // لو التمرين في ليفل الكلمات (طوله أكبر من حرف واحد)، خدي أول حرف منه
      if (cleanContent.length > 1) {
        targetLetter = cleanContent.charAt(0); // "سمكة" أو "ثعلب" تتحول لـ الحرف الأول
      } else {
        targetLetter = cleanContent; // لو حرف جاهز أصلاً سيبه كقيمة صافية
      }

      // أرشفة الكلمة الأصلية اللي جاية من الموبايل جوه الميتاداتا
      dto.metadata = dto.metadata || {};
      dto.metadata.originalWordMistakes = [...dto.mistakes];
      dto.metadata.exerciseOriginalContent = cleanContent;

      // تحديث الـ mistakes بالحرف الصافي المستنتج من الداتابيز
      dto.mistakes = [targetLetter];
    } else {
      // لو الـ App مش باعت أي mistakes اصلاً، نضمن إنها مصفوفة فاضية
      dto.mistakes = [];
    }

    // حفظ الـ dto في قاعدة البيانات بأمان
    return this.submissionProvider.create(dto);
  }
  // GET BY CHILD
  async findByChild(childId: number, parentId: number) {
    const submissions =
      await this.submissionProvider.findByChildWithChild(childId);

    if (!submissions.length) {
      return [];
    }

    const child = submissions[0].child;

    if (Number(child.parentId) !== Number(parentId)) {
      console.log('Mismatch:', child.parentId, parentId);
      throw new ForbiddenException('You cannot access this child data');
    }

    return submissions;
  }

  async getReport(childId: number, parentId: number) {
    // 1. جلب البيانات
    const submissions = await this.submissionProvider.findByChildWithChild(childId);

    if (!submissions || !submissions.length) {
      return {
        hasData: false,
        message: 'لم يقم الطفل بأي تمرين بعد',
        stats: {
          reading: { percentage: 0, status: 'لا توجد بيانات' },
          writing: { percentage: 0, status: 'لا توجد بيانات' },
          performance: { percentage: 0, status: 'لا توجد بيانات' },
        },
        chartData: [],
        lettersToPractice: [],
        alerts: [],
        activities: [],
      };
    }

    const child = submissions[0].child;

    // تأمين ضد كراش الـ parent المتوقع: إذا لم يكن موجوداً نمنع انهيار السيرفر
    if (!child) {
      throw new NotFoundException('Child data not found in submissions');
    }

    if (Number(child.parentId) !== Number(parentId)) {
      throw new ForbiddenException('You cannot access this child data');
    }

    // 2. حساب العمر بشكل دقيق جداً (بالأيام والشهور وليس السنوات فقط)
    let age = 0;
    if (child.birthDate) {
      try {
        const birth = new Date(child.birthDate);
        const today = new Date();
        if (!isNaN(birth.getTime()) && birth.getFullYear() > 1900) {
          age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          // إذا لم يأتِ يوم ميلاده بعد في السنة الحالية، نطرح سنة
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
        }
      } catch (e) {
        console.error('TRACE: Age calculation crashed:', e);
      }
    }

    // 3. حساب الإحصائيات العامة (Stats)
    const stats = {
      reading: this.calculateType(submissions, 'reading'),
      writing: this.calculateType(submissions, 'writing'),
      performance: this.calculateFocus(submissions),
    };

    // 4. تجهيز بيانات الشارت (آخر 3 تسليمات مرتبة زمنياً)
    submissions.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const lastSubmissions = submissions.slice(-3);

    // لحل مشكلة الهبوط للصفر: نحتفظ بآخر قيم مسجلة للمهارات الأخرى
    let lastReadingScore = stats.reading.percentage || 0;
    let lastWritingScore = stats.writing.percentage || 0;

    const chartData = lastSubmissions.map((s, index) => {
      const total = s.totalItems || 0;
      const mistakes = (s.mistakes || []).length;
      const score = total > 0 ? Math.round(((total - mistakes) / total) * 100) : 0;

      if (s.exerciseType === 'reading') lastReadingScore = score;
      if (s.exerciseType === 'writing') lastWritingScore = score;

      return {
        evaluationName: `تقييم ${index + 1}`,
        reading: lastReadingScore,
        writing: lastWritingScore,
        performance: this.calculateSingleFocus(s) || 0,
      };
    });

    // 5. تجميع وتحليل الأخطاء (الحروف والليفل)
    const detailedMistakes: { letter: string; level: string }[] = [];

    for (const s of submissions) {
      if (s.mistakes && s.mistakes.length > 0) {
        for (const letter of s.mistakes) {
          if (!letter) continue;
          const cleanLetter = String(letter).trim();
          const finalLetter = cleanLetter.length > 1 ? cleanLetter.charAt(0) : cleanLetter;

          detailedMistakes.push({
            letter: finalLetter,
            level: s.level || 'level1',
          });
        }
      }
    }

    const frequencyMap: Record<string, { count: number; letter: string; level: string }> = {};

    for (const item of detailedMistakes) {
      const key = `${item.letter}_${item.level}`;
      if (!frequencyMap[key]) {
        frequencyMap[key] = { count: 0, letter: item.letter, level: item.level };
      }
      frequencyMap[key].count += 1;
    }

    const sortedMistakes = Object.values(frequencyMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const lettersToPractice = [...new Set(sortedMistakes.map((m) => m.letter))];

    // 6. إنشاء التنبيهات (Alerts)
    const alerts: any[] = [];
    let alertId = 1;

    if (stats.reading.percentage < 40) {
      alerts.push({ id: alertId++, type: 'warning', text: 'مستوى القراءة يحتاج إلى دعم وتحسين' });
    }

    if (stats.writing.percentage < 30) {
      alerts.push({ id: alertId++, type: 'warning', text: 'مستوى الكتابة ضعيف جدًا ويحتاج متابعة مستمرة' });
    } else if (stats.writing.percentage < 40) {
      alerts.push({ id: alertId++, type: 'warning', text: 'مستوى الكتابة يحتاج إلى مزيد من التدريب' });
    }

    if (stats.performance.percentage < 40) {
      alerts.push({ id: alertId++, type: 'warning', text: 'مستوى الأداء والتركيز يحتاج إلى تطوير' });
    }

    if (stats.reading.percentage >= 70 && stats.writing.percentage >= 70 && stats.performance.percentage >= 70) {
      alerts.push({ id: alertId++, type: 'info', text: 'أداء الطفل ممتاز 👏 استمروا!' });
    }

    // 7. إنشاء الأنشطة (Activities)
    const activities: any[] = [];
    let id = 1;

    if (stats.reading.percentage < 50) {
      activities.push({ id: id++, type: 'reading', text: 'تمرين قراءة كلمات بسيطة وتحسين النطق' });
    }

    if (stats.writing.percentage < 50) {
      activities.push({ id: id++, type: 'writing', text: 'تمرين كتابة الحروف الأساسية بخط واضح' });
    }

    if (stats.performance.percentage < 50) {
      activities.push({ id: id++, type: 'performance', text: 'تمارين وألعاب تفاعلية لزيادة التركيز وسرعة الاستجابة' });
    }

    const getProblemDescription = (levelStr: string) => {
      const lvl = String(levelStr).replace('level', '').trim();
      switch (lvl) {
        case '1': return 'صعوبة في نطق وسماع الحرف بالشكل الصحيح';
        case '2': return 'صعوبة في تمييز ومد الحرف (حروف المد)';
        case '3':
        case '4': return 'صعوبة في قراءة وفك تشفير الكلمات التي تحتوي على الحرف';
        case '5': return 'صعوبة في كتابة ورسم اتجاهات الحرف بالترتيب';
        case '6': return 'صعوبة في نطق وسياق الجمل الطويلة للخطأ المشترك';
        case '7': return 'صعوبة في كتابة وإملاء كلمات كاملة تبدأ بهذا الحرف';
        default: return 'يحتاج إلى مراجعة وتدريب مكثف على هذا الحرف';
      }
    };

    if (sortedMistakes.length > 0) {
      sortedMistakes.forEach((item) => {
        const displayLevel = item.level.replace('level', '').trim();
        activities.push({
          id: id++,
          type: 'letters',
          letter: item.letter,
          level: item.level,
          text: `مراجعة حرف (${item.letter}) في [المستوى ${displayLevel}]: ${getProblemDescription(item.level)}`,
        });
      });
    }

    if (activities.length === 0) {
      activities.push({ id: id++, type: 'advanced', text: 'تمارين متقدمة لزيادة السرعة والدقة' });
    }

    // تأمين البريد الإلكتروني للـ Parent لتفادي الـ Crash إذا لم يكن مدمجاً بـ Include
    const parentEmail = child.parent ? child.parent.email : null;

    return {
      hasData: true,
      parentEmail: parentEmail,
      childName: child.name,
      age: age,
      lastEvaluation: new Date(submissions[submissions.length - 1].createdAt).toLocaleDateString('ar-EG'),
      stats,
      chartData,
      lettersToPractice,
      alerts,
      activities,
      readingImprovement: this.calculateImprovement ? this.calculateImprovement(submissions, 'reading') : 0,
      writingImprovement: this.calculateImprovement ? this.calculateImprovement(submissions, 'writing') : 0,
    };
  }
  private calculateType(submissions: any[], type: string) {
    const filtered = submissions.filter((s) => s.exerciseType === type);

    if (!filtered.length) {
      return { percentage: 0, status: 'ضعيف' };
    }

    let totalScore = 0;
    let count = 0;

    for (const s of filtered) {
      const total = s.totalItems || 0;
      const mistakesCount = (s.mistakes || []).length;

      if (total > 0) {
        const score = ((total - mistakesCount) / total) * 100;
        totalScore += score;
        count++;
      }
    }

    const percentage = count ? Math.round(totalScore / count) : 0;

    let status = 'ضعيف';

    if (percentage >= 70) status = 'جيد';
    else if (percentage >= 40) status = 'متوسط';

    return { percentage, status };
  }
  private calculateFocus(submissions: any[]) {
    let totalFocus = 0;
    let count = 0;

    for (const s of submissions) {
      const totalItems = s.totalItems || 0;
      const mistakesCount = (s.mistakes || []).length;
      const duration = s.duration || 0;
      const attemptsCount = s.attemptsCount || 1;

      if (totalItems <= 0) continue;

      // الدقة
      const accuracy = ((totalItems - mistakesCount) / totalItems) * 100;

      // الوقت المتوقع
      const expectedTime = totalItems * 10;

      const timeFactor =
        duration > 0 ? Math.min((expectedTime / duration) * 100, 100) : 100;

      const attemptsFactor =
        attemptsCount <= 1 ? 100 : Math.max(0, 100 - (attemptsCount - 1) * 20);

      const focus = accuracy * 0.6 + timeFactor * 0.2 + attemptsFactor * 0.2;

      totalFocus += focus;
      count++;
    }

    const percentage = count > 0 ? Math.round(totalFocus / count) : 0;

    let status = 'ضعيف';

    if (percentage >= 70) status = 'جيد';
    else if (percentage >= 40) status = 'متوسط';

    return {
      percentage,
      status,
    };
  }
  private calculateSingleFocus(s: any) {
    const totalItems = s.totalItems || 0;
    const mistakesCount = (s.mistakes || []).length;
    const duration = s.duration || 0;
    const attemptsCount = s.attemptsCount || 1;

    if (totalItems <= 0) {
      return 0;
    }

    const accuracy = ((totalItems - mistakesCount) / totalItems) * 100;

    const expectedTime = totalItems * 10;

    const timeFactor =
      duration > 0 ? Math.min((expectedTime / duration) * 100, 100) : 100;

    const attemptsFactor =
      attemptsCount <= 1 ? 100 : Math.max(0, 100 - (attemptsCount - 1) * 20);

    return Math.round(accuracy * 0.6 + timeFactor * 0.2 + attemptsFactor * 0.2);
  }
  private calculateImprovement(submissions: any[], type: string) {
    const filtered = submissions.filter((s) => s.exerciseType === type);

    if (filtered.length < 2) {
      return {
        difference: 0,
        trend: 'stable',
      };
    }

    const first = filtered[0];
    const last = filtered[filtered.length - 1];

    const firstScore =
      ((first.totalItems - (first.mistakes?.length || 0)) / first.totalItems) *
      100;

    const lastScore =
      ((last.totalItems - (last.mistakes?.length || 0)) / last.totalItems) *
      100;

    const difference = Math.round(lastScore - firstScore);

    return {
      difference,
      trend:
        difference > 0 ? 'improved' : difference < 0 ? 'declined' : 'stable',
    };
  }
}
