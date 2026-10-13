import React from 'react';

/** Portrait crops from the approved illustrated Operations Floor artwork. */
const art = 'https://cdn.openart.ai/openart-uploads/production/attachment-transfers/7e266aaa058d7d314d5382cbdae610e5e0c81063e94ac5fca041903fec9509eb.png';
// QA crop offsets at a reduced sprite size: more hair, shoulders and headset in view.
const coordinates:Record<string,{x:number,y:number}> = {
  manager:{x:-46,y:-3},
  sysadmin:{x:-8,y:-344},
  security:{x:-317,y:-344},
  cloud:{x:-626,y:-344},
  qa:{x:-8,y:-491},
  implement:{x:-317,y:-491},
  developer:{x:-626,y:-491},
};
export default function OfficePortrait({role='manager'}:{role?:string}){
  const offset=coordinates[role]||coordinates.manager;
  return <span className="illustrated-portrait-svg anime-portrait" aria-hidden="true">
    <img src={art} alt="" loading="lazy" draggable={false} style={{left:offset.x,top:offset.y}}/>
  </span>;
}
