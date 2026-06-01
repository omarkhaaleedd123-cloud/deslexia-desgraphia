import {
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
    const child = await this.childModel.findByPk(dto.childId);

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    if (Number(child.parentId) !== Number(parentId)) {
      throw new ForbiddenException('You cannot add data to this child');
    }

    // 🌟 المنطق الجديد: طالما فيه أخطاء مبعوتة، صلحها واستنتج الحرف فوراً بغض النظر عن الـ status
    if (dto.mistakes && dto.mistakes.length > 0) {
      // الذهاب لجدول الـ exercises لمعرفة تفاصيل التمرين بناءً على الـ id
      const exercise = await this.exerciseModel.findByPk(dto.exerciseId);

      if (exercise) {
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
      }
    } else {
      // لو الـ App مش باعت أي mistakes اصلاً، نضمن إنها مصفوفة فاضية
      dto.mistakes = [];
    }

    // حفظ الـ dto في قاعدة البيانات
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
    const submissions =
      await this.submissionProvider.findByChildWithChild(childId);

    if (!submissions.length) {
      return {
        hasData: false,
        message: 'لم يقم الطفل بأي تمرين بعد',

        stats: {
          reading: {
            percentage: 0,
            status: 'لا توجد بيانات',
          },
          writing: {
            percentage: 0,
            status: 'لا توجد بيانات',
          },
          performance: {
            percentage: 0,
            status: 'لا توجد بيانات',
          },
        },

        chartData: [],
        lettersToPractice: [],
        alerts: [],
        activities: [],
      };
    }
    const child = submissions[0].child;
    if (child.parentId !== parentId) {
      throw new ForbiddenException('You cannot access this child data');
    }
    const parent = child.parent;
    let age = 0;
    if (child.birthDate) {
      try {
        const bDate = new Date(child.birthDate);

        if (!isNaN(bDate.getTime()) && bDate.getFullYear() > 1900) {
          age = new Date().getFullYear() - bDate.getFullYear();
          console.log(
            'TRACE: Method 1 (Date Object) worked. Year:',
            bDate.getFullYear(),
          );
        } else {
          const dateStr = String(child.birthDate);
          const yearMatch = dateStr.match(/\d{4}/);
          if (yearMatch) {
            const year = parseInt(yearMatch[0], 10);
            age = new Date().getFullYear() - year;
            console.log('TRACE: Method 2 (Regex) worked. Year:', year);
          }
        }
      } catch (e) {
        console.error('TRACE: Age calculation crashed:', e);
      }
    }

    // stats
    const stats = {
      reading: this.calculateType(submissions, 'reading'),
      writing: this.calculateType(submissions, 'writing'),
      performance: this.calculateFocus(submissions),
    };

    // chart
    submissions.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const lastSubmissions = submissions.slice(-3);

    const chartData = lastSubmissions.map((s, index) => {
      const total = s.totalItems || 0;
      const mistakes = (s.mistakes || []).length;

      const score =
        total > 0 ? Math.round(((total - mistakes) / total) * 100) : 0;

      return {
        evaluationName: `تقييم ${index + 1}`,

        reading: s.exerciseType === 'reading' ? score : 0,
        writing: s.exerciseType === 'writing' ? score : 0,
        performance: this.calculateSingleFocus(s),
      };
    });

    // -----------------------------------------------------------------
    // 🌟 الجزء المطور: تجميع الأخطاء وربطها برقم الليفل للتشخيص الدقيق
    // -----------------------------------------------------------------
    const detailedMistakes: { letter: string; level: string }[] = [];

    for (const s of submissions) {
      if (s.mistakes && s.mistakes.length > 0) {
        for (const letter of s.mistakes) {
          detailedMistakes.push({
            letter,
            level: s.level, // هيقرأ 'level1' أو '1' على حسب تخزينك
          });
        }
      }
    }

    // خريطة تكرار ذكية تجمع (الحرف + الليفل) كمفتاح فريد
    const frequencyMap: Record<string, { count: number; letter: string; level: string }> = {};

    for (const item of detailedMistakes) {
      const key = `${item.letter}_${item.level}`;
      if (!frequencyMap[key]) {
        frequencyMap[key] = { count: 0, letter: item.letter, level: item.level };
      }
      frequencyMap[key].count += 1;
    }

    // ترتيب التوب 5 مشاكل من الأكثر تكراراً للأقل
    const sortedMistakes = Object.values(frequencyMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // مصفوفة الحروف الضعيفة الصافية للـ UI التقليدي
    const lettersToPractice = [...new Set(sortedMistakes.map((m) => m.letter))];

    // alerts
    const alerts: any[] = [];
    let alertId = 1;

    // reading
    if (stats.reading.percentage < 40) {
      alerts.push({
        id: alertId++,
        type: 'warning',
        text: 'مستوى القراءة يحتاج إلى دعم وتحسين',
      });
    }

    // writing
    if (stats.writing.percentage < 30) {
      alerts.push({
        id: alertId++,
        type: 'warning',
        text: 'مستوى الكتابة ضعيف جدًا ويحتاج متابعة مستمرة',
      });
    } else if (stats.writing.percentage < 40) {
      alerts.push({
        id: alertId++,
        type: 'warning',
        text: 'مستوى الكتابة يحتاج إلى مزيد من التدريب',
      });
    }

    // listening
    if (stats.performance.percentage < 40) {
      alerts.push({
        id: alertId++,
        type: 'warning',
        text: 'مستوى الأداء يحتاج إلى تطوير',
      });
    }

    // ممتاز
    if (
      stats.reading.percentage >= 70 &&
      stats.writing.percentage >= 70 &&
      stats.performance.percentage >= 70
    ) {
      alerts.push({
        id: alertId++,
        type: 'info',
        text: 'أداء الطفل ممتاز 👏 استمروا!',
      });
    }

    // activities
    const activities: any[] = [];
    let id = 1;

    // reading general
    if (stats.reading.percentage < 50) {
      activities.push({
        id: id++,
        type: 'reading',
        text: 'تمرين قراءة كلمات بسيطة وتحسين النطق',
      });
    }

    // writing general
    if (stats.writing.percentage < 50) {
      activities.push({
        id: id++,
        type: 'writing',
        text: 'تمرين كتابة الحروف الأساسية بخط واضح',
      });
    }

    // listening general
    // performance alert
    if (stats.performance.percentage < 40) {
      alerts.push({
        id: alertId++,
        type: 'warning',
        text: 'مهارات التركيز والأداء تحتاج إلى تطوير',
      });
    }

    // 🌟 دالة مساعدة لترجمة نوع الصعوبة بناءً على رقم الليفل
    const getProblemDescription = (levelStr: string) => {
      const lvl = levelStr.replace('level', '').trim();
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

    // 🌟 تحويل توب الأخطاء المكتشفة إلى أنشطة تشخيصية موجهة للحرف والليفل بالظبط
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

    // لو كله ممتاز
    if (activities.length === 0) {
      activities.push({
        id: id++,
        type: 'advanced',
        text: 'تمارين متقدمة لزيادة السرعة والدقة',
      });
    }

    return {
      hasData: true,
      parentEmail: parent.email,
      childName: child.name,
      age: age,
      lastEvaluation: new Date(
        submissions[submissions.length - 1].createdAt,
      ).toLocaleDateString('ar-EG'),

      stats,
      chartData,
      lettersToPractice,
      alerts,
      activities,
      readingImprovement: this.calculateImprovement(submissions, 'reading'),

      writingImprovement: this.calculateImprovement(submissions, 'writing'),
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
