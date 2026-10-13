import React from 'react';

/** Each agent has their own WebP portrait generated from the approved artwork. */
const roles:Record<string,string>={
 manager:'manager',sysadmin:'sysadmin',security:'security',cloud:'cloud',qa:'qa',implement:'implement',developer:'developer'
};
export default function OfficePortrait({role='manager'}:{role?:string}){
 const file=roles[role]||'manager';
 return <span className="illustrated-portrait-svg anime-portrait" aria-hidden="true">
    <img src={`${import.meta.env.BASE_URL}portraits/${file}.webp`} alt="" loading="lazy" draggable={false} />
 </span>;
}
