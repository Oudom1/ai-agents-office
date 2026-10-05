import React from 'react';
import {Composition} from 'remotion';
import {KaiSecurityComedy} from './KaiSecurityComedy';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="KaiSecurityComedy"
      component={KaiSecurityComedy}
      durationInFrames={1800}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
