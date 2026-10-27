function layout(){
  const sa=getComputedStyle($('sa')),st=parseFloat(sa.paddingTop)||0,sb=parseFloat(sa.paddingBottom)||0,sl=parseFloat(sa.paddingLeft)||0,sr=parseFloat(sa.paddingRight)||0;
  const vw=innerWidth,vh=innerHeight,portrait=touchy&&vh>vw*1.05,bs=document.body.style;
  document.body.classList.toggle('portrait',portrait);document.body.classList.toggle('land',touchy&&!portrait);
  $('pad').hidden=!touchy;$('keys').hidden=touchy;$('turn').hidden=!portrait;
  const gutL=Math.max(16,sl),gutR=Math.max(16,sr),top=Math.max(10,st)+46;
  if(portrait){
    const w=vw-gutL-gutR,h=w*9/16;RECT={x:gutL,y:top+4,w,h};
    const stick=Math.min(156,vw*.36),btn=Math.min(56,vw*.14);
    bs.setProperty('--stick',stick+'px');bs.setProperty('--b',btn+'px');
    bs.setProperty('--padTop',(RECT.y+h+26)+'px');$('turn').style.top=(RECT.y+h+8)+'px';
  }else{
    const bottom=touchy?Math.max(8,sb)+4:Math.max(10,sb)+30,aw=vw-gutL-gutR,ah=vh-top-bottom;let w=aw,h=w*9/16;if(h>ah){h=ah;w=h*16/9;}
    RECT={x:gutL+(aw-w)/2,y:top+(ah-h)/2,w,h};
    if(touchy){const stick=Math.min(140,vh*.34),btn=Math.min(50,vh*.12);bs.setProperty('--stick',stick+'px');bs.setProperty('--b',btn+'px');}
  }
}
