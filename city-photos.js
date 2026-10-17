'use strict';

// Photographic plates generated for each city; vehicle pixels remain in their source files.
var CITY_SCENES={};
(function(){
    var names=['Благовещенск','Уфа','Волгоград','Воронеж','Иркутск','Черкесск','Краснодар','Красноярск','Москва','Нижний Новгород','Новосибирск','Омск','Пермь','Владивосток','Ростов-на-Дону','Самара','Санкт-Петербург','Екатеринбург','Казань','Тюмень','Хабаровск','Челябинск','Алдан','Якутск','Магдагачи'];
    var columns=[0,397,794,1190,1587,1983],rows=[0,174,337,489,639,793];
    names.forEach(function(name,index){
        var city=CITIES.find(function(c){return c.name===name;});if(!city)return;
        var col=index%5,row=Math.floor(index/5);
        CITY_SCENES[city.id]={name:name,src:'img/cities/russian-city-backdrops-v1.webp',width:1983,height:793,
            region:[columns[col]+2,rows[row]+2,columns[col+1]-columns[col]-4,rows[row+1]-rows[row]-4],snow:name==='Алдан'||name==='Якутск'};
    });
    // Different paint only on the model-specific body annotations, never glass, wheels or backdrop.
    CARS.forEach(function(car){
        if(!car.expanded || !vehicleVisual(car))return;
        var colors=['silver','white','black','blue','red','green'];
        car.catalogueColor=colors[(Math.imul(car.id,2654435761)>>>0)%colors.length];
        car.full='Цвет — '+vehicleColor(car.catalogueColor).name.toLowerCase()+'. '+car.full;
    });
})();
var cityPhotoDefinitions=Object.create(null),cityPhotoDefSequence=0;
function cityPhotoDefs(markup){
    var defs=$('cityPhotoDefinitions');
    if(!defs){
        var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');
        svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
        defs=document.createElementNS('http://www.w3.org/2000/svg','defs');defs.id='cityPhotoDefinitions';svg.appendChild(defs);document.body.appendChild(svg);
    }
    var group=document.createElementNS('http://www.w3.org/2000/svg','g');group.innerHTML=markup;
    while(group.firstChild)defs.appendChild(group.firstChild);
}
function cityPhotoSource(car){
    if(!car)return null;
    var art=vehicleVisual(car),frame=art || car.illustration;
    var region=frame && (frame.region || [frame.column*frame.width/frame.columns,frame.row*frame.height/frame.rows,frame.width/frame.columns,frame.height/frame.rows]);
    var key=frame?frame.src+'#'+region.join(','):car.img;
    var source=CITY_VEHICLE_MASKS[key];
    if(!source){art=null;key=car.img;source=CITY_VEHICLE_MASKS[key];}
    return source?{key:key,mask:source,art:art}:null;
}
function cityPhotoDefinition(source){
    if(cityPhotoDefinitions[source.key])return cityPhotoDefinitions[source.key];
    var id='city-vehicle-'+(++cityPhotoDefSequence),art=source.art,mask=source.mask;
    var markup='<clipPath id="'+id+'" clipPathUnits="userSpaceOnUse"><path d="'+mask.path+'"/></clipPath>';
    if(art){
        function polygon(points){return '<polygon points="'+points.map(function(p){return (art.region[0]+p[0]*art.region[2]/1000).toFixed(2)+','+(art.region[1]+p[1]*art.region[2]/1000).toFixed(2);}).join(' ')+'"/>';}
        markup+='<mask id="'+id+'-paint" maskUnits="userSpaceOnUse" x="'+art.region[0]+'" y="'+art.region[1]+'" width="'+art.region[2]+'" height="'+art.region[3]+'"><g fill="white">'+art.body.map(polygon).join('')+'</g><g fill="black">'+art.glass.concat(art.exclude||[]).map(polygon).join('')+'</g></mask>';
    }
    cityPhotoDefs(markup);cityPhotoDefinitions[source.key]=id;return id;
}
function cityPhotoColorFilter(color){
    var id='city-paint-'+color.id;
    if(!cityPhotoDefinitions[id]){cityPhotoDefs(photoToneFilter(id,color.tone));cityPhotoDefinitions[id]=true;}
    return id;
}
function cityVehiclePhoto(car,override){
    var source=cityPhotoSource(car);if(!source)return '';
    var location=garage.indexOf(car.id)!==-1 && typeof vehicleState==='function'?vehicleState(car.id):null;
    var cityId=location && location.cityId || car.cityId || moscowCity.id,scene=CITY_SCENES[cityId];if(!scene)return '';
    var mask=source.mask,id=cityPhotoDefinition(source),seed=(Math.imul(car.id,2246822519)>>>0);
    var r=scene.region.slice(),zoom=(seed%5)*2;r[0]+=zoom;r[2]-=zoom*2;
    var width=850+seed%90,height=350+(seed>>>8)%36,x=(1000-width)/2+(seed%21-10),y=590-height;
    var image='<image data-vehicle-source="true" href="'+esc(mask.src)+'" width="'+mask.width+'" height="'+mask.height+'"/>';
    var carLayer='<g clip-path="url(#'+id+')">'+image;
    if(source.art){
        var appearance=override || vehicleAppearance(car),color=vehicleColor(appearance.color)||vehicleColor('silver');
        if(color.id!=='silver')carLayer+='<g mask="url(#'+id+'-paint)" filter="url(#'+cityPhotoColorFilter(color)+')">'+image.replace(' data-vehicle-source="true"','')+'</g>';
    }
    var state=career && career.vehicles[car.id],worn=(!state || !state.repaired) && (car.condition==='cosmetic' || (car.basePrice||car.price)<=100000);
    if(worn){var b=mask.bbox;carLayer+='<path d="M'+(b[0]+b[2]*.3)+' '+(b[1]+b[3]*.66)+' l'+b[2]*.22+' -'+b[3]*.025+' m-'+b[2]*.1+' '+b[3]*.08+' l'+b[2]*.2+' -'+b[3]*.03+'" fill="none" stroke="#39342f" stroke-width="1.2" opacity=".28"/>';}
    carLayer+='</g>';
    var shownColor=source.art?' · '+(vehicleColor((override || vehicleAppearance(car)).color)||vehicleColor('silver')).name:'';
    var label=car.name+shownColor+' · '+scene.name+(scene.snow?' · снег':'')+' · иллюстрация игрового экземпляра';
    return '<span class="car-visual city-photo-wrap'+(source.art?' urban-photo-wrap':'')+'"><svg class="car-photo-frame city-vehicle-photo'+(source.art?' urban-model-photo':'')+'" viewBox="0 0 1000 650" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+esc(label)+'" data-photo-city="'+esc(cityId)+'" data-photo-variant="'+seed+'">'+
        '<svg width="1000" height="650" viewBox="'+r.join(' ')+'" preserveAspectRatio="xMidYMid slice" overflow="hidden"><image data-city-backdrop="true" href="'+scene.src+'" width="'+scene.width+'" height="'+scene.height+'"/></svg>'+
        '<ellipse cx="500" cy="590" rx="300" ry="14" fill="'+(scene.snow?'#4b596c':'#14202c')+'" opacity=".2" style="filter:blur(8px)"/>'+
        '<svg x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" viewBox="'+mask.bbox.join(' ')+'" preserveAspectRatio="xMidYMax meet">'+carLayer+'</svg></svg></span>';
}
