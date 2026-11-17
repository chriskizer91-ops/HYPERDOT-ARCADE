/* ================= the back room's floor plan =================
   THE MAIN ROOM: the finished handheld under the sign, and the 3D rebuilds of the arcade's games.
   THE WORKSHOP, through the doorway in the far wall: the unfinished games.
   The gallery is by the door from the main floor; the X Room and the empty room open off the main room. */
const RX=Math.PI/2;
const G_=(id,title,o={})=>Object.assign({id,title,src:ROOT+'games/'+id+'.html'},o);

/* THE FAR WALL of the main room: under the BACK ROOM sign, the finished handheld; the doorway on its right leads to the Workshop */
Handheld({name:'What the Map Forgot',sub:'Handheld adventure · finished',x:-2.4,z:ZB+.58,ry:0,res:[192,128],
  game:G_('mapforgot','WHAT THE MAP FORGOT',{bridge:false,deluxe:true})});

/* THE WORKSHOP: the unfinished games, each on a cabinet built to look like its game. All of them play. */
EnvoiShrine({name:'Envoi on the Longest Night',sub:'A story in chapters · in progress',x:-3.4,z:-25.2,ry:0,res:[320,180],
  game:G_('envoi','ENVOI ON THE LONGEST NIGHT',{bridge:false,deluxe:true})});
FaireBooth({name:'Moon Faire',sub:'The performers · in progress',x:3.4,z:-24.85,ry:0,res:[320,180],
  game:G_('moonfaire','MOON FAIRE',{bridge:false,deluxe:true})});
/* THE 3D REBUILDS, in the main room: each game being rebuilt in 3D, on a cabinet built like it. They play the arcade's own builds
   (one folder up), so they're always the newest, and each offers the new version and the Retro 2D original. */
/* Ironhowl: the Howler, kneeling with its hatch open in the nook behind the X Room */
const ARC='../';
MechCockpit({name:'Ironhowl',sub:'Climb into the Howler · pick a version',x:8.0,z:-11.0,ry:-RX,res:[384,216],
  game:{id:'ironhowl',title:'Ironhowl',deluxe:true,choices:[
    {title:'Ironhowl 3D',sub:'The mech arena in real 3D · in progress',src:ARC+'v2/games/ironhowl3d.html',deluxe:true},
    {title:'Ironhowl 3',sub:'Four arenas and Endless mode · Ironhowl 4 is in the Workshop',src:ARC+'v2/games/ironhowl3/index.html',deluxe:true},
    {title:'Ironhowl',sub:'Retro 2D · the original, on the LED matrix',src:ARC+'games/ironhowl.html'}]}});
const UP=(id,title,list)=>({id,title,deluxe:true,choices:list.map(([t,s,src,retro])=>({title:t,sub:s,src:ARC+src,deluxe:!retro}))});
BowlLane({name:'Strike Night',sub:'Bowl a frame · 3D or Retro 2D',x:-7.8,z:-9.8,ry:0,
  game:UP('bowl','Strike Night',[['Strike Night 3D','The night lane in real 3D · finished','v2/games/bowl3d.html'],['Strike Night','Retro 2D · the original','games/bowl.html',1]])});
LanceFighter({name:'Voidlance',sub:'Climb into the cockpit · 3D or Retro 2D',x:-3.9,z:-9.6,ry:0,
  game:UP('voidlance','Voidlance',[['Voidlance 3D','Six missions, one lance, one leviathan · in 3D','v2/games/voidlance3d.html'],['Voidlance','Retro 2D · the original, on the LED matrix','games/voidlance.html',1]])});
VersusCab({name:'Voltfist',sub:'Step up · 3D or Retro 2D',x:1.2,z:-3.6,ry:0,
  game:UP('voltfist','Voltfist',[['Voltfist 3D','Five fighters in real 3D · in progress','v2/games/voltfist3d.html'],['Voltfist','Retro 2D · the original, on the LED matrix','games/voltfist.html',1]])});
HoverBike({name:'Prisma',sub:'Get on the bike · 3D or Retro 2D',x:1.2,z:-9.4,ry:0,
  game:UP('prisma','Prisma',[['Prisma 3D','The neon city at night · in progress','v2/games/prisma3d.html'],['Prisma','Retro 2D · the original, on the LED matrix','games/prisma.html',1]])});
ForgeMolten({name:'Molten',sub:'Work the forge · Molten II or Retro 2D',x:7.95,z:1.9,ry:-RX,
  game:UP('molten','Molten',[['Molten II','The forge in 3D · in progress','v2/games/molten3d.html'],['Molten','Retro 2D · the original, on the LED matrix','games/molten.html',1]])});
ClawDeluxe({name:'Plush Panic',sub:'Try the claw · 3D or Retro 2D',x:8.05,z:5.4,ry:-RX,
  game:UP('claw','Plush Panic',[['Plush Panic 3D','Three machines of soft plushes · in progress','v2/games/claw3d.html'],['Plush Panic','Retro 2D · the original','games/claw.html',1]])});
/* Air Hockey 3D: a full-size table under a hanging scoreboard */
HockeyTable({name:'Air Hockey 3D',sub:'One or two players · first to 7',x:-3.9,z:-3.4,ry:0,game:G_('airhockey','AIR HOCKEY 3D',{src:ROOT+'games/airhockey3d.html',deluxe:true})});
Lamppost({name:'Lantern',sub:'Light the lamps · pick a version',x:-5.9,z:ZB+1.4,ry:0,
  game:UP('lantern','Lantern',[['Lantern: The Long Night','The newest one · in progress','v2/games/lanternr.html'],['Lantern 3D','The first 3D version','v2/games/lantern3d.html'],['Lantern','Retro 2D · the original, amber plasma','games/lantern.html',1]])});
/* Redline County: the front half of the stock SUV, on a patch of the game's dirt. Climb in; the windshield is the screen */
RedlineSUV({name:'Redline County',sub:'Climb into the SUV · pick a game',x:1.0,z:-19.6,ry:1.97,res:[320,180],
  game:{id:'redlinecounty',title:'Redline County',choices:[
    {title:'Road Not Found + Traffic',sub:'Wide Open 2, the full game · heavy: best on a laptop',src:ROOT+'games/roadnotfound.html',bridge:false},
    {title:'Salt & Sand',sub:'The Studio 2 SUV on the salt flats · runs well on phones',src:ROOT+'games/saltsand.html',bridge:false}]}});
/* THE NEWEST THREE. Ironhowl 4 plays (games/ironhowl4/, the build of 15 Nov 2026). The other two cabinets are ready
   and show a card until their games are in: swap soon(...) for game:G_('<id>','<TITLE>',{deluxe:true}) and put the file in games/. */
WraithBay({name:'Ironhowl 4',sub:'Pilot the Wraith · in progress',x:7.6,z:-17.2,ry:-RX,res:[384,216],
  game:G_('ironhowl4','IRONHOWL 4',{src:ROOT+'games/ironhowl4/index.html',deluxe:true})});
MudTruck({name:'Mud Lab',sub:'Get stuck on purpose · being built',x:-4.8,z:-18.4,ry:.6,res:[320,180],
  game:soon('mudlab','Mud Lab',[
    'Mud Lab is the soil game from the Redline County line. You drive the Rock & Mud or the stock SUV on ground that tears up for real: ruts, mud and standing water.',
    'Getting stuck is the game. There’s a winch and a strap for getting out again, and a bush plane, the Heron, on its own strip.',
    'It’s being built now. When it’s finished, this cabinet will play it.'])});
Showroom({name:'Salt & Sand Showroom',sub:'The SUVs up close · being built',x:7.2,z:-21.9,ry:-RX,res:[320,180],
  game:soon('showroom','Salt & Sand Showroom',[
    'The Showroom puts Redline County’s SUVs on a turntable, in a black room or a white one, so you can look closely at each before you drive it.',
    'It’s being built now. When it’s finished, this cabinet will play it.'])});
Workbench({x:B.x0+.42,z:-18.4,ry:RX});
HalfBuilt({x:B.x0+.75,z:-24.9,ry:RX});

/* THE GALLERY: art from the games, made with AI */
ArtFrame({id:'keyart',name:'Envoi · key art',sub:'Art made with AI',x:B.x0+.04,z:-3.3,ry:RX,src:ROOT+'art/envoi-keyart.webp',w:1.6,h:.9,
  title:'Envoi on the Longest Night',cap:'Key art · made with AI'});
ArtFrame({id:'courtyard',name:'Envoi · the courtyard',sub:'Art made with AI',x:B.x0+.04,z:.4,ry:RX,src:ROOT+'art/envoi-courtyard.webp',w:1.5,h:1.0,
  title:'The courtyard',cap:'From Envoi on the Longest Night · made with AI'});
ArtFrame({id:'village',name:'Envoi · the village',sub:'Art made with AI',x:B.x0+.04,z:4.1,ry:RX,src:ROOT+'art/envoi-village.webp',w:1.4,h:1.05,
  title:'The village at night',cap:'From Envoi on the Longest Night · made with AI'});
ArtFrame({id:'island',name:'The island',sub:'Art made with AI',x:7.0,z:CL.z+CL.t/2+.01,ry:0,src:ROOT+'art/map-island.webp',w:1.25,h:1.0,
  title:'The island',cap:'From What the Map Forgot · made with AI'});
ArtFrame({id:'coast',name:'The coast town',sub:'Art made with AI',x:5.3,z:CL.z+CL.t/2+.01,ry:0,src:ROOT+'art/map-coast.webp',w:1.45,h:1.04,
  title:'The coast town',cap:'From What the Map Forgot · made with AI'});
ArtFrame({id:'jester',name:'The Jester',sub:'Art made with AI',x:8.3,z:CL.z+CL.t/2+.01,ry:0,src:ROOT+'art/moon-jester.webp',w:.55,h:1.12,y:1.62,pixel:true,
  title:'The Jester',cap:'From Moon Faire · made with AI'});

/* THE DOOR to the main floor (V2, one folder up). You start just inside it, so coming through from the floor needs no ARRIVE entry. */
Doorway({name:'Main floor',sub:'Back to the arcade',x:0,z:B.z1-.04,ry:Math.PI,label:'MAIN FLOOR',to:'../v2/?from=backroom'});

/* THE X ROOM: five panels about what this is. Drafted from Christopher's own words; his to rewrite. */
Panel({id:'what',name:'What this is',sub:'Panel 1 of 5',x:5.6,z:CL.zn+.1,ry:0,title:'What this is',body:[
  'Hyperdot Arcade is a walkable arcade I built in the autumn of 2026. Every cabinet is a real game, and every game is its own web page, so a lot of people can be here at once.',
  'It started with a pinball machine. Part of the pinball game became a dot-matrix screen, and that screen became the whole idea.',
  'I can’t write code. I built all of it by talking with an AI.']});
Panel({id:'collab',name:'Collaboration + augmentation',sub:'Panel 2 of 5',x:7.8,z:CL.zn+.1,ry:0,col:'#ff2f9a',cols:GRAD.pink,title:'Collaboration + augmentation',body:[
  'I think of AI as both a collaborator and an augmentation: a partner and an assistant fused together. That picture might come from the Halo games I grew up with.',
  'Claude wrote the functions that make this a space. I decided what the space should be, tested it, and kept the back and forth going until it felt right.']});
Panel({id:'mine',name:'The part that’s mine',sub:'Panel 3 of 5',x:B.x1-.02,z:-5.6,ry:-RX,col:'#ffd23f',cols:GRAD.gold,title:'The part that’s mine',body:[
  'Making the code isn’t the hard part anymore. Knowing what’s worth building is.',
  'It can’t be a one-off. It has to be a back and forth, testing the thing for real: playing the game, or checking my watering software against how I actually water.',
  'The discernment and the motivation are what I bring.']});
Panel({id:'future',name:'The future of media',sub:'Panel 4 of 5',x:B.x1-.02,z:-3.4,ry:-RX,col:'#b47aff',cols:GRAD.violet,title:'The future of media',body:[
  'Software that used to be worth hundreds of thousands of dollars can now be made for one person and one need.',
  'A business card with a QR code can open a whole 3D space. Games can live inside a game.',
  'I think this is it. I feel empowered by it, genuinely.']});
Panel({id:'open',name:'Open by design',sub:'Panel 5 of 5',x:6.4,z:CL.z-CL.t/2-.01,ry:Math.PI,col:'#6dff7a',cols:GRAD.green,title:'Open by design',body:[
  'This arcade is public on purpose. I want people to see what one person and an AI can make together, and how.',
  'Saying out loud that AI helped me make this is the best voice I can have for it going in a beneficial direction.',
  'The back room is where games live while they’re still being built.']});
