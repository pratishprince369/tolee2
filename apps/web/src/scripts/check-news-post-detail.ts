import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../lib/prisma';

async function main() {
  const news = await prisma.newsPost.findFirst({
    where: { slug: { contains: 'james-webb' } },
    include: { post: true }
  });

  console.log("NEWS POST IN DB:", {
    slug: news?.slug,
    headline: news?.headline,
    sourceUrl: news?.sourceUrl,
    coverCaption: news?.coverCaption,
    postMediaUrls: news?.post?.mediaUrls,
    postMediaTypes: news?.post?.mediaTypes,
  });

  process.exit(0);
}

main();
