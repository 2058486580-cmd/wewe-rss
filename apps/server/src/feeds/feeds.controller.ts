import {
  Controller,
  DefaultValuePipe,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Query,
  Request,
  Response,
} from '@nestjs/common';
import { FeedsService } from './feeds.service';
import { Response as Res, Request as Req } from 'express';
import { PrismaService } from '@server/prisma/prisma.service';

@Controller('feeds')
export class FeedsController {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly feedsService: FeedsService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('/')
  async getFeedList() {
    return this.feedsService.getFeedList();
  }

  @Get('/authors')
  async getAuthors() {
    const feeds = await this.prismaService.feed.findMany({
      select: {
        id: true,
        mpName: true,
        mpIntro: true,
        mpCover: true,
        status: true,
        syncTime: true,
        updateTime: true,
      },
    });
    return {
      items: feeds.map((f) => ({
        mp_id: f.id,
        author_name: f.mpName,
        intro: f.mpIntro,
        cover: f.mpCover,
        status: f.status,
        sync_time: f.syncTime,
        update_time: f.updateTime,
      })),
    };
  }

  @Get('/all.(json|rss|atom)')
  async getFeeds(
    @Request() req: Req,
    @Response() res: Res,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number = 30,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('mode') mode: string,
    @Query('title_include') title_include: string,
    @Query('title_exclude') title_exclude: string,
  ) {
    const path = req.path;
    const type = path.split('.').pop() || '';

    const { content, mimeType } = await this.feedsService.handleGenerateFeed({
      type,
      limit,
      page,
      mode,
      title_include,
      title_exclude,
    });

    res.setHeader('Content-Type', mimeType);
    res.send(content);
  }

  @Get('/:feed')
  async getFeed(
    @Response() res: Res,
    @Param('feed') feed: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('mode') mode: string,
    @Query('title_include') title_include: string,
    @Query('title_exclude') title_exclude: string,
    @Query('update') update: boolean = false,
  ) {
    const [id, type] = feed.split('.');
    this.logger.log('getFeed: ', id);

    if (update) {
      this.feedsService.updateFeed(id);
    }

    const { content, mimeType } = await this.feedsService.handleGenerateFeed({
      id,
      type,
      limit,
      page,
      mode,
      title_include,
      title_exclude,
    });

    res.setHeader('Content-Type', mimeType);
    res.send(content);
  }
}
