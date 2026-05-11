import {
  Controller, Get, Post, Param, Body, UseGuards, Request,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get('today')
  getToday(@Request() req) {
    return this.tasksService.getTodaysTasks(req.user.id);
  }

  @Get('submissions')
  getSubmissions(@Request() req) {
    return this.tasksService.getUserSubmissions(req.user.id);
  }

  @Get(':id')
  getTask(@Param('id') id: string) {
    return this.tasksService.getTaskById(id);
  }

  @Post(':id/submit')
  @UseInterceptors(FileInterceptor('photo', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new Error('Only image files are allowed'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  submitTask(
    @Request() req,
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() photo?: { buffer: Buffer; mimetype: string },
  ) {
    const metadata = body.metadata ? (typeof body.metadata === 'string' ? JSON.parse(body.metadata) : body.metadata) : {};
    return this.tasksService.submitTask(
      req.user.id,
      id,
      { metadata },
      photo?.buffer,
      photo?.mimetype,
    );
  }

  @Post(':submissionId/appeal')
  appeal(@Request() req, @Param('submissionId') submissionId: string) {
    return this.tasksService.appealSubmission(req.user.id, submissionId);
  }
}
