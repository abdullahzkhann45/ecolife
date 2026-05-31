import {
  Controller, Get, Post, Delete, Param, Body, UseGuards, Request,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { GPSPoint } from './gps-pipeline.types';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private tasksService: TasksService,
  ) {}

  @Get('today')
  getToday(@Request() req) { return this.tasksService.getTodaysTasks(req.user.id); }

  @Get('submissions')
  getSubmissions(@Request() req) { return this.tasksService.getUserSubmissions(req.user.id); }

  @Get('commitments')
  getCommitments(@Request() req) { return this.tasksService.getCommitments(req.user.id); }

  @Get('commitment-progress')
  getProgress(@Request() req) { return this.tasksService.getCommitmentProgress(req.user.id); }

  @Get('progress')
  getUserProgress(@Request() req) { return this.tasksService.getUserProgress(req.user.id); }

  @Get(':id')
  getTask(@Param('id') id: string) { return this.tasksService.getTaskById(id); }

  @Post(':id/commit')
  commit(@Request() req, @Param('id') id: string) { return this.tasksService.commitToTask(req.user.id, id); }

  @Delete(':id/commit')
  uncommit(@Request() req, @Param('id') id: string) { return this.tasksService.uncommitFromTask(req.user.id, id); }

  @Post(':id/submit')
  @UseInterceptors(FileInterceptor('photo', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) cb(new Error('Only image files allowed'), false);
      else cb(null, true);
    },
  }))
  submitTask(
    @Request() req, @Param('id') id: string, @Body() body: any,
    @UploadedFile() photo?: { buffer: Buffer; mimetype: string },
  ) {
    const metadata = body.metadata ? (typeof body.metadata === 'string' ? JSON.parse(body.metadata) : body.metadata) : {};
    const selfRating = body.selfRating ? parseInt(body.selfRating, 10) : undefined;
    return this.tasksService.submitTask(req.user.id, id, { metadata }, photo?.buffer, photo?.mimetype, selfRating);
  }

  @Post(':id/verify-gps')
  verifyGPS(@Request() req, @Param('id') id: string, @Body() body: { trail: GPSPoint[]; hasPhoto?: boolean }) {
    return this.tasksService.handleGPSSubmission(req.user.id, id, body.trail, !!body.hasPhoto);
  }

  @Post(':submissionId/appeal')
  appeal(@Request() req, @Param('submissionId') sid: string) { return this.tasksService.appealSubmission(req.user.id, sid); }
}
