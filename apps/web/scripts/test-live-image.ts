import { OpenHiggsfieldMediaService } from '../src/modules/tolee-ai-agent/media/generation-service';

async function main() {
  console.log('Generating image with Tolee Open-Higgsfield AI...');
  const result = await OpenHiggsfieldMediaService.generateImage({
    userId: 'test_user_live',
    prompt: 'Luxury modern villa with warm ambient lighting at sunset, 8k resolution, photorealistic',
    aspectRatio: '1:1',
  });

  console.log('Generation Result:');
  console.log('- Status:', result.status);
  console.log('- Task ID:', result.taskId);
  console.log('- Model:', result.modelId);
  console.log('- Image URL:', result.outputUrls[0]);
}

main().catch(console.error);
