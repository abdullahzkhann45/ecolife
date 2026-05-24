import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GpsSession, GpsSessionDocument } from '../tasks/gps-session.schema';
import { TaskSubmission, TaskSubmissionDocument, SubmissionStatus } from '../tasks/task-submission.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(GpsSession.name) private sessionModel: Model<GpsSessionDocument>,
    @InjectModel(TaskSubmission.name) private submissionModel: Model<TaskSubmissionDocument>,
  ) {}

  async getGpsSessions(query: {
    page?: number; limit?: number; mode?: string;
    verdict?: string; dateFrom?: string; dateTo?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));

    const filter: any = {};
    if (query.mode) filter.mode = query.mode;
    if (query.verdict) filter.verdict = query.verdict;
    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
      if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo + 'T23:59:59');
    }

    const [items, total] = await Promise.all([
      this.sessionModel.find(filter).populate('userId', 'username').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      this.sessionModel.countDocuments(filter),
    ]);

    return {
      items: items.map(s => ({
        id: s._id.toString(),
        userId: s.userId?.toString(),
        username: (s.userId as any)?.username || 'unknown',
        submissionId: s.submissionId?.toString(),
        pointCount: s.pointCount,
        distanceMeters: s.distanceMeters,
        durationSeconds: s.durationSeconds,
        avgSpeedKmh: s.avgSpeedKmh,
        maxSpeedKmh: s.maxSpeedKmh,
        mode: s.mode,
        verdict: s.verdict,
        confidence: s.confidence,
        antiCheatFlags: JSON.parse(s.antiCheatFlags || '[]'),
        adminOverrideBy: s.adminOverrideBy,
        adminOverrideReason: s.adminOverrideReason,
        createdAt: (s as any).createdAt,
      })),
      total, page, totalPages: Math.ceil(total / limit),
    };
  }

  async getGpsSessionDetail(id: string) {
    const s = await this.sessionModel.findById(id).populate('userId', 'username');
    if (!s) throw new NotFoundException('GPS session not found');
    return {
      id: s._id.toString(),
      userId: s.userId?.toString(),
      username: (s.userId as any)?.username || 'unknown',
      rawTrail: s.rawTrail ? JSON.parse(s.rawTrail) : null,
      summary: s.summary ? JSON.parse(s.summary) : null,
      pointCount: s.pointCount,
      distanceMeters: s.distanceMeters,
      durationSeconds: s.durationSeconds,
      avgSpeedKmh: s.avgSpeedKmh,
      maxSpeedKmh: s.maxSpeedKmh,
      mode: s.mode,
      verdict: s.verdict,
      confidence: s.confidence,
      antiCheatFlags: JSON.parse(s.antiCheatFlags || '[]'),
      adminOverrideBy: s.adminOverrideBy,
      adminOverrideReason: s.adminOverrideReason,
    };
  }

  async overrideSession(id: string, adminId: string, action: 'approve' | 'reject', reason: string) {
    const session = await this.sessionModel.findById(id);
    if (!session) throw new NotFoundException('GPS session not found');

    session.verdict = action === 'approve' ? 'approved' : 'rejected';
    session.adminOverrideBy = adminId;
    session.adminOverrideReason = reason;
    await session.save();

    if (session.submissionId) {
      const sub = await this.submissionModel.findById(session.submissionId);
      if (sub) {
        if (action === 'approve') {
          sub.status = SubmissionStatus.APPROVED;
          sub.rejectionReason = null;
        } else {
          sub.status = SubmissionStatus.REJECTED;
          sub.rejectionReason = `Admin override: ${reason}`;
        }
        sub.verifiedAt = new Date();
        await sub.save();
      }
    }

    return { success: true, verdict: session.verdict };
  }
}
