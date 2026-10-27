let VOICE=store.get('vl-voice','1')==='1';
const VOX={CMD:{p:.8,r:.98},JUNO:{p:1.35,r:1.05},RIX:{p:.55,r:.95},VIPER:{p:.3,r:.86},SYS:{p:1,r:1}};
function say(txt,who){
  if(AU.muted||!VOICE)return;
  try{const s=window.speechSynthesis;if(!s)return;s.cancel();const u=new SpeechSynthesisUtterance(txt),vx=VOX[who]||VOX.SYS;u.pitch=vx.p;u.rate=vx.r;u.volume=.95;
    const vs=s.getVoices?s.getVoices():[];const en=vs.filter(v=>/^en/i.test(v.lang));const fem=en.find(v=>/female|samantha|victoria|karen|moira|zira|google us english/i.test(v.name));
    const v=who==='JUNO'&&fem?fem:en.find(v=>/male|daniel|alex|fred|aaron|arthur|rishi|google uk english male/i.test(v.name))||en[0];if(v)u.voice=v;s.speak(u);}catch(e){}
}
