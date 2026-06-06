import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ChatProvider } from '../providers/chat.provider';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import {
  CreateConversationDto,
  CreateMessageDto,
  UpdateConversationDto,
  QueryConversationDto,
} from '../dto';
import { PaginationResult } from '../../common/interfaces/pagination';
import { QueryMessageDto } from '../dto/query-message.dto';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class ChatService implements OnModuleInit {
  private groq: Groq;
  private readonly logger = new Logger(ChatService.name);
  private readonly SHELBY_BOT_ID = 999;

  constructor(
    private readonly chatProvider: ChatProvider,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');

    if (!apiKey) {
      this.logger.error('GROQ_API_KEY is missing in .env file!');
      throw new Error('GROQ_API_KEY is missing or empty');
    }

    this.groq = new Groq({ apiKey });
  }

  async findUserConversations(userId: number): Promise<Conversation[]> {
    return this.chatProvider.findUserConversations(userId);
  }

  async findAllConversations(
    queryDto: QueryConversationDto,
  ): Promise<PaginationResult<Conversation>> {
    const { rows, count } =
      await this.chatProvider.findAllConversations(queryDto);
    const { page, limit } = queryDto;

    return {
      data: rows,
      meta: {
        total: count,
        page: Number(page || 1),
        limit: Number(limit || 10),
        totalPages: Math.ceil(count / (limit || 10)),
      },
    };
  }

  async getConversation(id: number, userId?: number): Promise<Conversation> {
    const conversation = await this.chatProvider.findOneConversation(id);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (userId && conversation.userId !== userId) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    return conversation;
  }

  async updateConversation(
    id: number,
    updateConversationDto: UpdateConversationDto,
    userId: number,
  ): Promise<Conversation> {
    await this.getConversation(id, userId);
    await this.chatProvider.updateConversation(id, updateConversationDto);
    return this.getConversation(id);
  }

  async countConversations(): Promise<number> {
    return this.chatProvider.countConversations();
  }

  async createConversation(
    createConversationDto: CreateConversationDto,
    userId: number,
  ): Promise<Conversation> {
    return this.chatProvider.createConversation(createConversationDto, userId);
  }

  // 2. تعديل إرسال الرسالة عشان يسحب اسم الطفل صح
  async sendMessage(
    createMessageDto: CreateMessageDto,
    conversationId: number,
    senderId: number,
  ): Promise<Message> {
    // جلب المحادثة شاملة بيانات الطفل (عشان نستخدم الاسم في الـ AI)
    const conversation =
      await this.chatProvider.findOneConversation(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    // سحب اسم الطفل من العلاقة اللي ضفناها في الـ Provider
    const childName = (conversation as any).child?.name || 'البطل';

    // حفظ رسالة المستخدم
    await this.chatProvider.createMessage({
      conversationId,
      senderId,
      content: createMessageDto.content,
      type: 'text',
    });

    // جلب الـ History
    const history = await this.chatProvider.findConversationMessages(
      conversationId,
      10,
    );
    const formattedHistory = history.map((msg) => ({
      role: msg.senderId === this.SHELBY_BOT_ID ? 'assistant' : 'user',
      content: msg.content,
    }));

    // استدعاء الـ AI مع الـ Prompt المصري الجديد واسم الطفل
    const aiAnalysis = await this.getAiResponse(
      createMessageDto.content,
      formattedHistory,
      childName,
    );

    // حفظ رد شلبي بالميتا داتا
    return this.chatProvider.createMessage({
      conversationId,
      senderId: this.SHELBY_BOT_ID,
      content: aiAnalysis.reply,
      type: 'text',
      metadata: aiAnalysis.feedback,
    });
  }

  // 3. الـ Prompt المصري المحدث مع اسم الطفل
  private async getAiResponse(
    userContent: string,
    history: any[],
    childName: string,
  ) {
    const systemPrompt = `
    You are a male AI assistant specialized in Dyslexia and Dysgraphia named Shelby "شلبي".
    You are helping a parent with their child named "${childName}".
    Your ONLY output must be a single, valid JSON object. 

    ### JSON Structure:
    {
     "reply": "A warm, natural Arabic response to the parent",
     "feedback": {
       "detected_words": [],
       "suspected_letter": "",
       "issue_type": "" 
      }
    }

    ### Rules for "reply":
    - MUST be in Egyptian/White Arabic dialect (اللهجة المصرية البيضاء).
    - Speak strictly using male conjugations for yourself (استخدم صيغة المذكر للتعبير عن نفسك).
    - Always refer to the child by their name "${childName}" in your reply.
    - Respond to greetings naturally (e.g., "وعليكم السلام يا فندم").
    - If a problem is mentioned, reassure the parent and say: "سجلت الكلمات دي في خطة ${childName} اليومية".
    - DO NOT explain the analysis or mention JSON.

    ### Rules for "feedback":
    - "detected_words": ONLY the target words mentioned by the parent.
    - "suspected_letter": ONE character representing the difficulty.
    - "issue_type": ONLY "dyslexia" or "dysgraphia".

    ### Constraint:
    IF THE USER ASKS ABOUT SOMETHING IRRELEVANT:
    - Respond in "reply" that you are specialized in learning difficulties only.
    - Keep "feedback" fields empty.

    CRITICAL: RETURN ONLY THE JSON.
    `;

    const completion = await this.groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userContent },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    try {
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      return {
        reply: `يا فندم حصل مشكلة بسيطة، ممكن نراجع كلامنا عن ${childName} تاني؟`,
        feedback: { detected_words: [], suspected_letter: '', issue_type: '' },
      };
    }
  }
  async getMessages(
    conversationId: number,
    query: QueryMessageDto,
    userId?: number,
  ): Promise<PaginationResult<Message>> {
    if (userId) {
      await this.getConversation(conversationId, userId);
    }
    query.conversationId = conversationId;
    const { rows, count } = await this.chatProvider.findAllMessages(query);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;

    return {
      data: rows,
      meta: {
        total: count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    const message = await this.chatProvider.findMessageById(messageId);
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId === userId) return;
    await this.chatProvider.updateMessageReadStatus(messageId, true);
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.chatProvider.countUnreadMessages(userId);
  }

  async deleteConversation(id: number, userId: number): Promise<void> {
    const conversation = await this.chatProvider.findOneConversation(id);
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.userId !== userId)
      throw new ForbiddenException('No permission');
    await this.chatProvider.deleteConversation(id);
  }

  async findAllMessages(queryDto: any = {}): Promise<any> {
    return this.chatProvider.findAllMessages(queryDto);
  }

  async deleteMessage(id: number, userId: number): Promise<void> {
    const message = await this.chatProvider.findMessageById(id);
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId)
      throw new ForbiddenException('Access denied');
    await this.chatProvider.deleteMessage(id);
  }

  async getMessageStats(): Promise<number> {
    return this.chatProvider.countMessages();
  }
  async onModuleInit() {
    try {
      // بنشيك هل شلبي موجود في الداتابيز (اللي هي على Aiven حالياً)
      const shelbyExists = await User.findByPk(this.SHELBY_BOT_ID);

      if (!shelbyExists) {
        await User.create({
          id: this.SHELBY_BOT_ID,
          email: 'shelby-bot@ai.com',
          password: 'system-generated-password',
          role: 'parent',
          isActive: true,
          isEmailVerified: true,
          avatar: 'https://cdn-icons-png.flaticon.com/512/616/616430.png', // لوجو مؤقت لشلبي
        } as any);

        this.logger.log(
          '✅ Shelby Bot was created successfully in the database.',
        );
      } else {
        this.logger.log('ℹ️ Shelby Bot already exists.');
      }
    } catch (error) {
      this.logger.error('❌ Error initializing Shelby Bot:', error);
    }
  }
}
