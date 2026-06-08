export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import VideoGeneratorComponent from '@gitroom/frontend/components/video-generator/video-generator.component';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Video Generator`,
  description: '',
};

export default async function Page() {
  return <VideoGeneratorComponent />;
}
