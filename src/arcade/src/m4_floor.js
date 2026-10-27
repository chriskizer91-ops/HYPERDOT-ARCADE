/* ================= the floor plan ================= */
const RX=Math.PI/2;
const G_=(id,title,o={})=>Object.assign({id,title,src:'games/'+id+'.html'},o);
/* VIDEO, along the left wall */
Cabinet({name:'Star Vanguard',sub:'Vertical shooter · built into the arcade',x:-15.35,z:-6.2,ry:RX,game:StarVanguard(),body:'#120c22',side:'#1d1238',trim:'#58e8ff',art:'#3a62ff',ball:'#ff3b6b',
  marquee(g){const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,'#060a2a');gr.addColorStop(1,'#1a0630');g.fillStyle=gr;g.fillRect(0,0,256,64);
    for(let i=0;i<60;i++){g.fillStyle=i%3?'#7b84c9':'#fff';g.fillRect((i*53)%256,(i*29)%64,1,1);}
    gradText(g,'STAR',128,6,3,['#ffffff','#fff3c4','#ffe14d','#ffb52e','#ff8a2e','#ff3b6b','#c2304a']);
    gradText(g,'VANGUARD',128,34,3,['#ffffff','#e6f9ff','#9ff1ff','#58e8ff','#2fb8ff','#3a62ff','#5a2fd8']);}});
Upright({name:'Hyperdot',sub:'Space shooter · 128×32 DMD',x:-15.35,z:-5.1,ry:RX,game:G_('hyperdot','HYPERDOT'),aspect:4,res:[128,32],body:'#140a06',side:'#241208',trim:'#ff9a1e',art:['#3a1a06','#ff9a1e','#140804'],mCols:GRAD.amber,mTop:'#2a1206',glow:[1,.55,.15],col:'#ff9a1e'});
Upright({name:'Voltfist',sub:'Fighting game',x:-15.35,z:-4.0,ry:RX,game:G_('voltfist','VOLTFIST'),res:[384,216],body:'#0a0e22',side:'#141a3a',trim:'#4fa8ff',art:['#0a1440','#3a7bff','#ff2a4a'],motif:'rays',mCols:GRAD.cyan,mTop:'#0a1440',glow:[.35,.55,1],col:'#4fa8ff'});
Upright({name:'Ironhowl',sub:'Mech arena shooter',x:-15.35,z:-2.9,ry:RX,game:G_('ironhowl','IRONHOWL'),res:[384,216],body:'#16100a',side:'#2a1c10',trim:'#ff7a2e',art:['#2a1406','#ff7a2e','#3a3a40'],motif:'stripes',mCols:GRAD.amber,mTop:'#2a1406',glow:[1,.5,.2],col:'#ff7a2e'});
Upright({name:'Voidlance',sub:'Space dogfight',x:-15.35,z:-1.8,ry:RX,game:G_('voidlance','VOIDLANCE'),res:[384,216],body:'#060812',side:'#0e1224',trim:'#9ff1ff',art:['#050818','#2a3a8a','#c45cff'],motif:'grid',mCols:GRAD.violet,mTop:'#0a0820',glow:[.6,.4,1],col:'#c45cff'});
Upright({name:'Lantern',sub:'A lamplighter, a town of shades',x:-15.35,z:-.7,ry:RX,game:G_('lantern','LANTERN'),aspect:2,res:[192,96],body:'#120a04',side:'#201206',trim:'#ffb84a',art:['#1a0c04','#ff9a2e','#060402'],mCols:GRAD.amber,mTop:'#1a0c04',glow:[1,.6,.2],col:'#ffb84a'});
Upright({name:'Molten',sub:'Pour iron, hold the forge',x:-15.35,z:.4,ry:RX,game:G_('molten','MOLTEN'),res:[320,180],body:'#140604',side:'#2a0c06',trim:'#ff5a1a',art:['#2a0604','#ff5a1a','#4fe3ff'],motif:'rays',mCols:GRAD.red,mTop:'#2a0604',glow:[1,.35,.15],col:'#ff5a1a'});
/* DELUXE, back left: the airship pod you climb into, Ultramassive beside it */
FlightPod({name:'Skies of Aethermoor',sub:'Deluxe flight pod · climb inside',x:-12.4,z:-8.7,ry:0,game:G_('aethermoor','SKIES OF AETHERMOOR',{deluxe:true}),res:[256,144],transT:1.9});
Pinball({name:'Ultramassive',sub:'Deluxe pinball',x:-8.9,z:-10.0,ry:0,deluxe:true,game:G_('ultramassive','ULTRAMASSIVE',{deluxe:true,src:'games/ultramassive/index.html'}),
  backglass:'games/ultramassive/img/bg_title.webp',playfield:'games/ultramassive/img/playfield.webp',sideArt:['games/ultramassive/img/bg_devourer.webp','games/ultramassive/img/bg_warden.webp'],boxArt:'games/ultramassive/img/bg_final.webp',backglassCycle:['bg_devourer','bg_twins','bg_warden','bg_final'].map(n=>'games/ultramassive/img/'+n+'.webp'),body:'#160a2a',trim:'#ff9a2e',trim2:'#4fe3ff',glow:[1,.45,.25],
  scores:['GRAND CHAMPION','UMB  60,000,000','DVR  30,000,000']});
/* the back wall, under the sign: the ticket wheel, the stacker and the whack table */
Wheel({name:'Cyclone',sub:'The ticket wheel · one button',x:0,z:-11.35,ry:0,game:G_('cyclone','CYCLONE'),res:[256,144]});
Tower({name:'Sky Stack',sub:'Stack the lamps to the prize',x:-2.5,z:-11.25,ry:0,game:G_('stack','SKY STACK'),res:[41,23]});
WhackTable({name:'Whack Shack',sub:'Whack the critters',x:2.8,z:-10.95,ry:0,game:G_('whack','WHACK SHACK'),res:[256,144]});
/* RACING, back right */
Racer({name:'Redline',sub:'Grand Prix · sit-down',x:8.2,z:-10.25,ry:0,game:G_('redline','REDLINE'),res:[256,144],accent:'#ff2a4a',accent2:'#ffffff',neon:'#ff2a4a',mCols:GRAD.red,mTop:'#2a0408',mSub:'LED MATRIX GRAND PRIX',glow:[1,.3,.35],transT:1.4});
Racer({name:'Shiftlight',sub:'Racing career · sit-down',x:10.6,z:-10.25,ry:0,game:G_('shift','SHIFTLIGHT'),res:[256,144],accent:'#ffd23f',accent2:'#1a1a1a',neon:'#ffd23f',body:'#14141a',mCols:GRAD.gold,mTop:'#2a2006',mSub:'HYPERDOT ARCADE',glow:[1,.8,.3],transT:1.4});
BikeRide({name:'Prisma',sub:'Hover-bike pursuit · ride-on',x:13.1,z:-10.1,ry:0,game:G_('prisma','PRISMA'),res:[320,180],transT:1.4});
/* PINBALL, right wall: Supermassive, and two machines still under wraps */
Pinball({name:'Supermassive',sub:'Pinball',x:14.15,z:-1.4,ry:-RX,game:G_('supermassive','SUPERMASSIVE',{deluxe:true,src:'games/supermassive/index.html'}),
  backglass:'games/supermassive/img/backglass.jpg',playfield:'games/supermassive/img/playfield.jpg',sideArt:['games/supermassive/img/backglass2.jpg','games/supermassive/img/backglass3.jpg'],body:'#1c0a24',trim:'#ff4fb8',trim2:'#ffd23f',glow:[1,.4,.7],
  scores:['GRAND CHAMPION','SPM  20,000,000','EVH  10,000,000']});
/* The Hollow Crown took the first of the two spots held for the bigger games; the other stays under its sheet */
Upright({name:'The Hollow Crown',sub:'A lantern, a curse, a throne',x:15.35,z:2.3,ry:-RX,game:G_('crown','THE HOLLOW CROWN'),res:[320,180],marq:'HOLLOW CROWN',
  body:'#160f0a',side:'#24180e',trim:'#e8c878',art:['#2a1a0c','#c8902a','#0c0806'],motif:'rays',mCols:GRAD.gold,mTop:'#2a1a0c',ball:'#c8902a',btnA:'#e8c878',btnB:'#ff9f42',glow:[1,.7,.35],col:'#e8c878',crown:true});
Covered({name:'Coming soon',x:15.25,z:3.85,ry:-RX,seed:2.6});
{const mb=WORLD;neon2(mb,'COMING SOON',[ROOM.x1-.12,2.55,3.85],[0,0,1],.026,hex('#b47aff'),3.6);lightAt(ROOM.x1-1.2,2.3,3.85,3.5,[.6,.4,1],.55);}
/* REDEMPTION, in the middle of the floor */
Claw({name:'Plush Panic',sub:'Claw machine',x:-5.2,z:-1.7,ry:0,game:G_('claw','PLUSH PANIC'),res:[256,144]});
Pusher({name:'Coin Cascade',sub:'Coin pusher',x:-3.7,z:-1.7,ry:0,game:G_('pusher','COIN CASCADE'),res:[256,144]});
Alley({name:'Ring Roller',sub:'Roll it up the alley',x:4.1,z:-.9,ry:0,game:G_('roll','RING ROLLER'),res:[256,144]});
Hoops({name:'Bucket Blitz',sub:'Basketball',x:6.2,z:-.9,ry:0,game:G_('hoops','BUCKET BLITZ'),res:[256,96]});
Lane({name:'Strike Night',sub:'Bowling',x:-9.8,z:3.1,ry:0,game:G_('bowl','STRIKE NIGHT'),res:[256,144]});
AirHockey({x:0,z:.6});
