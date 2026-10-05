import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';

const sceneStyle: React.CSSProperties = {
  justifyContent: 'center',
  alignItems: 'center',
  padding: 90,
  fontFamily: 'Arial, Helvetica, sans-serif',
  textAlign: 'center',
  color: '#f7fbff',
};

const Caption: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{position:'absolute', left:70, right:70, bottom:120, background:'rgba(5,12,20,.78)', border:'3px solid rgba(255,255,255,.18)', borderRadius:32, padding:'28px 36px', fontSize:48, fontWeight:900, lineHeight:1.15}}>
    {children}
  </div>
);

const Pop: React.FC<{emoji:string; label:string; accent:string}> = ({emoji,label,accent}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{scale:interpolate(frame,[0,18,260,299],[.75,1,1,.9],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}), opacity:interpolate(frame,[0,12,285,299],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}>
      <div style={{fontSize:270, filter:'drop-shadow(0 24px 30px rgba(0,0,0,.35))'}}>{emoji}</div>
      <div style={{fontSize:68,fontWeight:1000,marginTop:18,color:accent,textShadow:'0 8px 24px rgba(0,0,0,.4)'}}>{label}</div>
    </div>
  );
};

const Scene1 = () => (
  <AbsoluteFill style={{...sceneStyle,background:'linear-gradient(160deg,#0e1725,#193a52)'}}>
    <Pop emoji="🧑‍💻" label="KAI: SECURITY EXPERT" accent="#84e9ff" />
    <Caption>“I finished the security check. Nothing can go wrong now.” 😎</Caption>
  </AbsoluteFill>
);

const Scene2 = () => {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{...sceneStyle,background:'linear-gradient(160deg,#16152a,#3a224e)'}}>
    <div style={{fontSize:230,rotate:`${interpolate(frame,[0,80,180,299],[-4,4,-3,2])}deg`}}>🖥️</div>
    <div style={{fontSize:74,fontWeight:1000,marginTop:30,color:'#d6c6ff'}}>SYSTEM STATUS: SECURE ✅</div>
    <Caption>Kai proudly presses “Deploy to Production”.</Caption>
  </AbsoluteFill>;
};

const Scene3 = () => {
  const frame=useCurrentFrame();
  const count=Math.min(99,Math.floor(frame/3)+1);
  return <AbsoluteFill style={{...sceneStyle,background:'linear-gradient(160deg,#2b0e12,#6a1824)'}}>
    <div style={{fontSize:220,scale:interpolate(frame,[0,20,45],[.7,1.25,1],{extrapolateRight:'clamp'})}}>🚨</div>
    <div style={{fontSize:96,fontWeight:1000,color:'#ffb4b4'}}>ALERTS: {count}</div>
    <div style={{fontSize:44,marginTop:30}}>Firewall • MFA • Server • SIEM • “Unknown USB device”</div>
    <Caption>Three seconds later… the dashboard discovers its feelings.</Caption>
  </AbsoluteFill>;
};

const Scene4 = () => {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{...sceneStyle,background:'linear-gradient(160deg,#17230f,#3e5d1a)'}}>
    <div style={{fontSize:250,translate:`${interpolate(frame,[0,160,299],[0,-20,0])}px ${interpolate(frame,[0,80,160,240,299],[0,-25,0,-20,0])}px`}}>🧑‍💻</div>
    <div style={{fontSize:58,fontWeight:1000,color:'#e6ff9e'}}>KAI’S INCIDENT RESPONSE PLAN</div>
    <div style={{fontSize:42,marginTop:26,lineHeight:1.45}}>1. Stay calm<br/>2. Refresh dashboard<br/>3. Refresh again<br/>4. Pretend refresh was a security control</div>
    <Caption>Kai: “This is not panic. This is… rapid validation.”</Caption>
  </AbsoluteFill>;
};

const Scene5 = () => {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{...sceneStyle,background:'linear-gradient(160deg,#10252d,#16556a)'}}>
    <div style={{display:'flex',gap:50,alignItems:'center',scale:interpolate(frame,[0,30],[.8,1],{extrapolateRight:'clamp'})}}>
      <div style={{fontSize:180}}>🧑‍💻</div><div style={{fontSize:120}}>➡️</div><div style={{fontSize:180}}>🔧</div><div style={{fontSize:120}}>➡️</div><div style={{fontSize:180}}>✅</div>
    </div>
    <div style={{fontSize:64,fontWeight:1000,marginTop:50,color:'#9ef5ff'}}>PATCH APPLIED • LOGS CHECKED • ACCESS VERIFIED</div>
    <Caption>Actual security work begins. The comedy temporarily stops.</Caption>
  </AbsoluteFill>;
};

const Scene6 = () => {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{...sceneStyle,background:'linear-gradient(160deg,#17151f,#312040)'}}>
    <div style={{fontSize:230,scale:interpolate(frame,[0,30,210,299],[.7,1,1,1.08],{extrapolateRight:'clamp'})}}>☕</div>
    <div style={{fontSize:72,fontWeight:1000,color:'#ffdca8'}}>INCIDENT CLOSED</div>
    <div style={{fontSize:48,marginTop:30}}>Root cause: “Someone clicked something.”</div>
    <Caption>Kai’s final recommendation: “Enable MFA… and maybe hide the Deploy button from me.” 😂</Caption>
  </AbsoluteFill>;
};

export const KaiSecurityComedy: React.FC = () => (
  <AbsoluteFill style={{backgroundColor:'#0b1119'}}>
    <Sequence from={0} durationInFrames={300}><Scene1/></Sequence>
    <Sequence from={300} durationInFrames={300}><Scene2/></Sequence>
    <Sequence from={600} durationInFrames={300}><Scene3/></Sequence>
    <Sequence from={900} durationInFrames={300}><Scene4/></Sequence>
    <Sequence from={1200} durationInFrames={300}><Scene5/></Sequence>
    <Sequence from={1500} durationInFrames={300}><Scene6/></Sequence>
  </AbsoluteFill>
);
