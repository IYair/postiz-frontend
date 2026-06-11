export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import VideoFlowComponent from '@gitroom/frontend/components/video-flow/video-flow.component';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Video Flow`,
  description: '',
};

export default async function Page() {
  return <VideoFlowComponent />;
}
