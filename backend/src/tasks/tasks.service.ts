import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskCategory, VerificationMechanism } from './task.entity';
import { TaskSubmission, SubmissionStatus } from './task-submission.entity';
import { PointsService } from '../points/points.service';
import { StreaksService } from '../streaks/streaks.service';
import { GeminiVerifyService } from './gemini-verify.service';

const SEED_TASKS = [
  { title: 'Walk or bike instead of driving', description: 'Complete your commute or an errand without a car.', category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.SENSOR, basePoints: 150, co2SavedGrams: 2400, proofInstructions: 'Use GPS tracking during your trip.' },
  { title: 'Take public transit', description: 'Use a bus, train, or subway for your trip.', category: TaskCategory.TRANSPORT, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 100, co2SavedGrams: 1800, proofInstructions: 'Take a photo of your transit ticket or stop.' },
  { title: 'Eat a plant-based meal', description: 'Choose a fully plant-based meal today.', category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 80, co2SavedGrams: 1500, proofInstructions: 'Photo of your plant-based meal.' },
  { title: 'Visit a farmers market', description: 'Buy local produce from a farmers market.', category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.GEO, basePoints: 120, co2SavedGrams: 800, proofInstructions: 'Check in at the farmers market location.' },
  { title: 'Scan a plant-based receipt', description: 'Purchase plant-based groceries and scan your receipt.', category: TaskCategory.DIET, verificationMechanism: VerificationMechanism.RECEIPT, basePoints: 90, co2SavedGrams: 1200, proofInstructions: 'Scan your grocery receipt.' },
  { title: 'Turn off lights when leaving a room', description: 'Save energy by switching off all lights.', category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.SELF_ATTEST, basePoints: 30, co2SavedGrams: 200, proofInstructions: 'Confirm you turned off all lights.' },
  { title: 'Unplug idle electronics', description: 'Unplug chargers and devices not in use.', category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 50, co2SavedGrams: 300, proofInstructions: 'Photo of unplugged devices.' },
  { title: 'Take a shorter shower', description: 'Cut your shower to 5 minutes or less.', category: TaskCategory.ENERGY, verificationMechanism: VerificationMechanism.SELF_ATTEST, basePoints: 40, co2SavedGrams: 150, waterSavedLiters: 50, proofInstructions: 'Confirm your short shower.' },
  { title: 'Recycle correctly', description: 'Sort and recycle your recyclables properly.', category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 60, wasteDivertedGrams: 500, proofInstructions: 'Photo of sorted recycling bin.' },
  { title: 'Visit a recycling center', description: 'Drop off recyclables at a certified center.', category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.GEO, basePoints: 100, wasteDivertedGrams: 1000, proofInstructions: 'Check in at the recycling center.' },
  { title: 'Pick up litter', description: 'Collect and properly dispose of litter in your area.', category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 120, wasteDivertedGrams: 300, proofInstructions: 'Before and after photos of the litter you collected.' },
  { title: 'Compost food waste', description: 'Add food scraps to your compost bin.', category: TaskCategory.WASTE, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 70, wasteDivertedGrams: 400, proofInstructions: 'Photo of your compost bin with today\'s scraps.' },
  { title: 'Use a reusable bag', description: 'Bring your own bag for shopping.', category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 40, wasteDivertedGrams: 5, proofInstructions: 'Photo of you using a reusable bag at the store.' },
  { title: 'Buy second-hand', description: 'Purchase a clothing or household item second-hand.', category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.RECEIPT, basePoints: 150, co2SavedGrams: 5000, proofInstructions: 'Scan the receipt from a thrift or second-hand store.' },
  { title: 'Repair instead of replace', description: 'Fix a broken item instead of buying new.', category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 130, co2SavedGrams: 3000, proofInstructions: 'Before and after photos of the repaired item.' },
  { title: 'Use a reusable water bottle', description: 'Avoid single-use plastic bottles all day.', category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.SELF_ATTEST, basePoints: 35, wasteDivertedGrams: 30, proofInstructions: 'Confirm you used a reusable bottle today.' },
  { title: 'Bring a reusable cup for coffee', description: 'Use your own cup at a café.', category: TaskCategory.CONSUMPTION, verificationMechanism: VerificationMechanism.PHOTO, basePoints: 45, wasteDivertedGrams: 10, proofInstructions: 'Photo of your reusable cup at the café.' },
];

@Injectable()
export class TasksService implements OnModuleInit {
  constructor(
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(TaskSubmission)
    private submissionRepo: Repository<TaskSubmission>,
    private pointsService: PointsService,
    private streaksService: StreaksService,
    private geminiVerify: GeminiVerifyService,
  ) {}

  async onModuleInit() {
    const count = await this.taskRepo.count();
    if (count === 0) {
      await this.taskRepo.save(SEED_TASKS.map(t => this.taskRepo.create(t)));
      console.log('Seeded task catalog');
    }
  }

  async getTodaysTasks(userId: string) {
    const tasks = await this.taskRepo.find({ where: { isActive: true } });
    const today = new Date().toISOString().slice(0, 10);
    const todaySubmissions = await this.submissionRepo.find({
      where: { userId },
    });
    const completedTodayIds = new Set(
      todaySubmissions
        .filter(s => s.createdAt.toISOString().slice(0, 10) === today && s.status === SubmissionStatus.APPROVED)
        .map(s => s.taskId),
    );
    return tasks.map(t => ({ ...t, completedToday: completedTodayIds.has(t.id) }));
  }

  async getTaskById(id: string) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async submitTask(userId: string, taskId: string, proofData: any, photoBuffer?: Buffer, photoMimeType?: string) {
    const task = await this.getTaskById(taskId);

    // For photo/receipt/sensor tasks, require a photo
    const needsPhoto = [VerificationMechanism.PHOTO, VerificationMechanism.RECEIPT, VerificationMechanism.SENSOR].includes(task.verificationMechanism);
    if (needsPhoto && !photoBuffer) {
      throw new BadRequestException('This task requires a photo for verification. Please upload a photo.');
    }

    const submission = this.submissionRepo.create({
      userId,
      taskId,
      proofUrl: proofData?.proofUrl || null,
      proofMetadata: JSON.stringify(proofData?.metadata || {}),
      status: SubmissionStatus.PENDING,
    });
    await this.submissionRepo.save(submission);

    const result = await this.verifySubmission(submission, task, userId, photoBuffer, photoMimeType);
    return result;
  }

  private async verifySubmission(
    submission: TaskSubmission,
    task: Task,
    userId: string,
    photoBuffer?: Buffer,
    photoMimeType?: string,
  ) {
    let newStatus = SubmissionStatus.APPROVED;
    let rejectionReason: string | null = null;
    let aiConfidence = 100;

    if (task.verificationMechanism === VerificationMechanism.SELF_ATTEST) {
      // Self-attest: auto-approve with small random audit chance
      if (Math.random() < 0.05) {
        newStatus = SubmissionStatus.APPEALED;
        rejectionReason = 'Selected for random audit. Please provide photo evidence.';
      }
    } else if (task.verificationMechanism === VerificationMechanism.GEO) {
      // Geo: auto-approve for now (would need real location data)
      newStatus = SubmissionStatus.APPROVED;
    } else if (photoBuffer && photoMimeType) {
      // Photo/Receipt/Sensor: use Gemini AI verification
      const imageBase64 = photoBuffer.toString('base64');
      const aiResult = await this.geminiVerify.verifyPhoto(imageBase64, photoMimeType, task);

      aiConfidence = aiResult.confidence;
      if (aiResult.approved) {
        newStatus = SubmissionStatus.APPROVED;
      } else {
        newStatus = SubmissionStatus.REJECTED;
        rejectionReason = aiResult.reason;
      }

      // Store AI result in metadata
      const existingMeta = JSON.parse(submission.proofMetadata || '{}');
      submission.proofMetadata = JSON.stringify({
        ...existingMeta,
        aiVerification: {
          approved: aiResult.approved,
          confidence: aiResult.confidence,
          reason: aiResult.reason,
        },
      });
    }

    submission.status = newStatus;
    submission.verifiedAt = new Date();
    submission.rejectionReason = rejectionReason;
    await this.submissionRepo.save(submission);

    if (newStatus === SubmissionStatus.APPROVED) {
      const points = await this.pointsService.awardTaskPoints(userId, submission.id, task);
      submission.pointsAwarded = points;
      await this.submissionRepo.save(submission);
      await this.streaksService.recordCompletion(userId);
    }

    return {
      submission,
      status: newStatus,
      pointsAwarded: submission.pointsAwarded || 0,
      aiConfidence,
      rejectionReason,
    };
  }

  async appealSubmission(userId: string, submissionId: string) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, userId },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    submission.status = SubmissionStatus.APPEALED;
    return this.submissionRepo.save(submission);
  }

  async getUserSubmissions(userId: string) {
    return this.submissionRepo.find({
      where: { userId },
      relations: ['task'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
