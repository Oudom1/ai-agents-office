import React from 'react';

/** Portrait crops from the approved illustrated Operations Floor artwork. */
const art = 'https://cdn.openart.ai/openart-uploads/production/attachment-transfers/7e266aaa058d7d314d5382cbdae610e5e0c81063e94ac5fca041903fec9509eb.png';
const coordinates:Record<string,{x:number,y:number}> = {
  manager:{x:-64,y:0},
  sysadmin:{x:-17,y:-410},
  security:{x:-381,y:-410},
  cloud:{x:-746,y:-410},
  qa:{x:-17,y:-582},
  implement:{x:-381,y:-582},
  developer:{x:-746,y:-582},
};
export default function OfficePortrait({role='manager'}:{role?:string}){
  const offset=coordinates[role]||coordinates.manager;
  return <span className="illustrated-portrait-svg anime-portrait" aria-hidden="true">
    <img src={art} alt="" loading="lazy" draggable={false} style={{left:offset.x,top:offset.y}}/>
  </span>;
}
