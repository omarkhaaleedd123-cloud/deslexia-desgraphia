import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubmissionProvider } from '../providers/submission.provider';
import { CreateSubmissionDto } from '../dto/create-submission.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Child } from '../../child/entities/child.entity';

@Injectable()
export class SubmissionService {
  constructor(
    private readonly submissionProvider: SubmissionProvider,

    @InjectModel(Child)
    private readonly childModel: typeof Child,
  ) {}

  // CREATE

  async create(dto: CreateSubmissionDto, parentId: number) {
    const child = await this.childModel.findByPk(dto.childId);

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    if (Number(child.parentId) !== Number(parentId)) {
      throw new ForbiddenException('You cannot add data to this child');
    }

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

    // letters
    const mistakes = submissions.flatMap((s) => s.mistakes || []);

    // count كل حرف
    const frequencyMap: Record<string, number> = {};

    for (const letter of mistakes) {
      frequencyMap[letter] = (frequencyMap[letter] || 0) + 1;
    }

    // ترتيب حسب التكرار
    const sortedLetters = Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1])
      .map(([letter]) => letter);

    // خد أهم 5
    const lettersToPractice = sortedLetters.slice(0, 5);
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

    // reading
    if (stats.reading.percentage < 50) {
      activities.push({
        id: id++,
        type: 'reading',
        text: 'تمرين قراءة كلمات بسيطة وتحسين النطق',
      });
    }

    // writing
    if (stats.writing.percentage < 50) {
      activities.push({
        id: id++,
        type: 'writing',
        text: 'تمرين كتابة الحروف الأساسية بخط واضح',
      });
    }

    // listening
    if (stats.performance.percentage < 50) {
      activities.push({
        id: id++,
        type: 'performance',
        text: 'تمارين لتحسين الأداء والسرعة',
      });
    }

    // letters practice
    if (lettersToPractice.length > 0) {
      activities.push({
        id: id++,
        type: 'letters',
        text: `مراجعة الحروف: ${lettersToPractice.join(' - ')}`,
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
