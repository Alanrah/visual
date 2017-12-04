
	if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

	var container;
	var camera, scene, renderer, controls;
	var raycaster = new THREE.Raycaster();
	var mouse = new THREE.Vector2();
	var selectedObjects = [];
	var geometry = new THREE.Geometry();//存放线条的vertices
	var geometryChange = new THREE.Geometry();//存放当前选中物体相关线条的vertices

	var lineGroup = new THREE.Group();//存放动态线条（柱子）
	lineGroup.name='lineGroup';
	var edges;

	var composer, effectFXAA, outlinePass,bgPass;
	var group = new THREE.Group();
	var layer1 = new THREE.Group();
	var layer2 = new THREE.Group();
	var layer3 = new THREE.Group();
	group.add(layer1);
	group.add(layer2);
	group.add(layer3);
	//各个layer层次高度
	var p1=-6,p2=0,p3=6;

	function initBackGround(){

		var sceneBG = new THREE.Scene();
		var cameraBG = new THREE.OrthographicCamera(-window.innerWidth, window.innerWidth, window.innerHeight, -window.innerHeight, -10000, 10000);
		cameraBG.position.z = 50;
		bgPass  = new THREE.RenderPass(sceneBG, cameraBG);

		var tloader = new THREE.TextureLoader();
		tloader.load("image/IT-background.png",function(texture){
			var materialColor = new THREE.MeshBasicMaterial({
	            map: texture,
	            depthTest: false
	        });
	        var bgPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), materialColor);
	        bgPlane.position.z = -100;
	        bgPlane.scale.set(window.innerWidth * 2, window.innerHeight * 2, 1);
	        sceneBG.add(bgPlane);
		});

	}

	function addLight(scene){
		var light = new THREE.PointLight( 0xffffff, 1, 100 );
		light.position.set( -8, 9, 0 );
		scene.add( light );
		light = new THREE.PointLight( 0xffffff, 1, 100 );
		light.position.set( 16, 9, 15 );
		scene.add( light );
		var light = new THREE.PointLight( 0xffffff, 1, 100 );
		light.position.set( 5, 15, 0 );
		scene.add( light );
		var light = new THREE.PointLight( 0xffffff, 1, 100 );
		light.position.set( -5, 15, 15 );
		scene.add( light );
	}

	function init(){

		container = document.createElement( 'div' );
		document.body.appendChild( container );
		var width = window.innerWidth;
		var height = window.innerHeight;
		renderer = new THREE.WebGLRenderer( { antialias: false ,alpha :true } );
		renderer.shadowMap.enabled = true;

		renderer.setSize( width, height );
		document.body.appendChild( renderer.domElement );
		scene = new THREE.Scene();
		scene.add(group);

		initBackGround();

		var opacity = 1.0;
		var transparent=true;
		// 创建3层layer
		var loader = new THREE.TextureLoader();
		loader.load(

			'image/layer.png',
			function ( texture ) {
				var material = new THREE.MeshPhongMaterial( {
					side: THREE.DoubleSide,
					map: texture
				 } );
				material.opacity = opacity;
				material.transparent = transparent; 
				var geometry = new THREE.PlaneBufferGeometry( 25, 15, 3.98 );

				var plane1 = new THREE.Mesh( geometry, material );
				plane1.rotateX(-Math.PI/2);
				plane1.position.set(0,p1,0);
				scene.add( plane1 );

				var plane2 = new THREE.Mesh( geometry, material );
				plane2.rotateX(-Math.PI/2);
				plane2.position.set(0,p2,0);
				scene.add( plane2 );

				var plane3 = new THREE.Mesh( geometry, material );
				plane3.rotateX(-Math.PI/2);
				plane3.position.set(0,p3,0);
				scene.add( plane3 );
			},

			function ( xhr ) {
				console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
			},

			function ( xhr ) {
				console.log( 'An error happened' );
			}
		);

		addLight(scene);

		dataDriven();

		camera = new THREE.PerspectiveCamera( 45, width / height, 1, 10000 );
		camera.position.set( 7, 23, 20 );
		controls = new THREE.OrbitControls( camera, renderer.domElement );
		controls.minDistance = 4;
		//controls.maxDistance = 20;
		//controls.enablePan = false;
		controls.enableDamping = true;
		controls.dampingFactor = 0.25;

		// postprocessing
		composer = new THREE.EffectComposer( renderer );
		renderer.setSize( width, height );
		var renderPass = new THREE.RenderPass( scene, camera );
		renderPass.clear = false;//若果不这么做，只会看到 rederpass的输出，会覆盖bgpass的输出
		composer.addPass(bgPass);
		composer.addPass( renderPass );
		outlinePass = new THREE.OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
		composer.addPass( outlinePass );
		var bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.1, 0.1);
		composer.addPass( bloomPass );
		effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
		effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
		effectFXAA.renderToScreen = true;
		composer.addPass( effectFXAA );
		window.addEventListener( 'resize', onWindowResize, false );
		document.addEventListener( 'mousedown', onDocumentMouseDown, false );
		window.addEventListener( 'mousemove', onTouchMove );
		window.addEventListener( 'touchmove', onTouchMove );

	}


	function onWindowResize() {

		var width = window.innerWidth;
		var height = window.innerHeight;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
		composer.setSize( width, height );
		effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );

		}

	function animate() {
		
		requestAnimationFrame( animate );
		controls.update();
		composer.render();
	}

	init();
	animate();
	//根据数据生成节点
	function dataDriven()
	{
		var bluematerial = new THREE.MeshPhongMaterial( {color: 0x66ffff} ); 
		var whitematerial = new THREE.MeshPhongMaterial( {color: 0xffdfc5} );
		var switchHeight = 0.5;
		var serverHeight = 1;

		var geometry1 = new THREE.BoxBufferGeometry( 2, switchHeight,2 );//switch
		var geometry2 = new THREE.BoxBufferGeometry( 1,serverHeight, 2  );//server
		
		$.getJSON ("json/data.json", function (data)  
		{ 
			//建立节点
			var nodes = data.nodes;
			for(var index in nodes){ 
				if(nodes[index].data.layer == 1){

					var server = new THREE.Mesh( geometry2, whitematerial );
					server.position.set(nodes[index].data.posx,p1+serverHeight/2,nodes[index].data.posz);
					server.userData = nodes[index].data;
					layer1.add( server );
				}
				else if(nodes[index].data.layer == 2){

					var switchx = new THREE.Mesh( geometry1, bluematerial );
					switchx.position.set(nodes[index].data.posx,p2+switchHeight/2,nodes[index].data.posz);
					switchx.userData = nodes[index].data;
					layer2.add( switchx );
				}
				else{
					var switchx = new THREE.Mesh( geometry1, bluematerial );
					switchx.position.set(nodes[index].data.posx,p3+switchHeight/2,nodes[index].data.posz);
					switchx.userData = nodes[index].data;
					layer3.add( switchx );
				}
			}
			//检测鼠标点击情况，建立边
			edges = data.edges;    
		});
	}
	//根据数据生成边
	function onDocumentMouseDown( event ){
		event.preventDefault();
	    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	    raycaster.setFromCamera( mouse, camera );
	    var intersects = raycaster.intersectObjects( [group], true );
	    var point = new Array();//存放每条线起始点的id

	    if ( intersects.length > 0){

	    	var object =intersects[0].object;
	    	var objectID = object.userData.id;
	    	var geometryLine = new THREE.Geometry();
	    	var materialLine = new THREE.LineBasicMaterial({color: 0x66ffff});

	    	if(object.userData.layer == 1){

	    		scene.traverse( function ( sceneChild ) {
		            if ( sceneChild.name === 'lineGroup' ) {
		            sceneChild.children = new Array();
		            scene.remove(sceneChild);
		            }
		        } );

		        point.length=0;

				for(var key in edges){

	        		if(edges[key].data.source == objectID){
	        			
	        			var target = edges[key].data.target;
	        			point.push(objectID);
	        			point.push(target);

	        			for(var index in edges){
	        				if(edges[index].data.source == target){
	        					point.push(target);
	        					point.push(edges[index].data.target);
	        				}
	        			}
	    		}
	    	}
	    	for(var i in point){
	    		group.traverse( function ( sceneChild ) {
			            if ( sceneChild.userData.id == point[i] )geometryLine.vertices.push(sceneChild.position); 
		        } );
	    	}
		     
	    }//if 删除先前的连线 	

	    	else if(object.userData.layer == 2){

	    		point.length=0;

	    		for(var key in edges){
	    			if(edges[key].data.source == objectID){
	    				point.push(objectID);
	    				point.push(edges[key].data.target)
	    			}
	    		}
	    		for(var i in point){
	    			group.traverse( function ( sceneChild ) {
			            if ( sceneChild.userData.id == point[i] ) geometryLine.vertices.push(sceneChild.position);
		        } );
	    	}
	    	}
	    	else{}

	    	initInfo(object);

	    	var line = new THREE.Line(geometryLine,materialLine);
	    	lineGroup.add(line);
	    	scene.add( lineGroup );
			//selectedObjects = [];
			//selectedObjects.push( lineGroup );//给选中的线条和物体加发光特效
			selectedObjects.push( object );
			outlinePass.selectedObjects = selectedObjects;

	    }//intersects.length > 0

	    
	}

	function initInfo(object){
		var info = document.getElementById("info");
		info.innerHTML = "";
		var container = new UI.Panel();

		var managerRow = new UI.Row();
		managerRow.add( new UI.Text( '' ).setWidth( '90px' ).setTextAlign("left") );
		container.add(managerRow);

		var managerRow = new UI.Row();
		managerRow.add( new UI.Text( '设备信息' ).setWidth( '90px' ).setLeft("20px") );
		managerRow.add( new UI.Text( "关闭" ).setWidth("200px").setTextAlign("right").onClick( function () {
			info.style.display = "none";

		} ) );
		container.add(managerRow);

		var managerRow = new UI.Row();
		managerRow.add( new UI.Text( '' ).setWidth( '90px' ).setTextAlign("left") );
		container.add(managerRow);

		var sourseNumberRow = new UI.Row();
		sourseNumberRow.add( new UI.Text( '资源编码' ).setWidth( '90px' ).setLeft("20px"));
		sourseNumberRow.add( new UI.Text( object.userData.serial ).setWidth("200px").setTextAlign("left") );
		container.add( sourseNumberRow );

		var sourseNumberRow = new UI.Row();
		sourseNumberRow.add( new UI.Text( '所在机房' ).setWidth( '90px' ).setLeft("20px"));
		sourseNumberRow.add( new UI.Text( object.userData.room ).setWidth("200px").setTextAlign("left") );
		container.add( sourseNumberRow );

		var sourseNumberRow = new UI.Row();
		sourseNumberRow.add( new UI.Text( '所在机柜' ).setWidth( '90px' ).setLeft("20px"));
		sourseNumberRow.add( new UI.Text( object.userData.cabinet ).setWidth("200px").setTextAlign("left") );
		container.add( sourseNumberRow );

		var sourseNumberRow = new UI.Row();
		sourseNumberRow.add( new UI.Text( '设备型号' ).setWidth( '90px' ).setLeft("20px"));
		sourseNumberRow.add( new UI.Text( object.userData.equip_type ).setWidth("200px").setTextAlign("left") );
		container.add( sourseNumberRow );

		var sourseNumberRow = new UI.Row();
		sourseNumberRow.add( new UI.Text( '设备名称' ).setWidth( '90px' ).setLeft("20px"));
		sourseNumberRow.add( new UI.Text( object.userData.label ).setWidth("200px").setTextAlign("left") );
		container.add( sourseNumberRow );

		var sourseNumberRow = new UI.Row();
		sourseNumberRow.add( new UI.Text( '保修时间' ).setWidth( '90px' ).setLeft("20px"));
		sourseNumberRow.add( new UI.Text( "1970-01-01" ).setWidth("200px").setTextAlign("left") );
		container.add( sourseNumberRow );

		var sourseNumberRow = new UI.Row();
		sourseNumberRow.add( new UI.Text( '投运时间' ).setWidth( '90px' ).setLeft("20px"));
		sourseNumberRow.add( new UI.Text( "1970-01-01" ).setWidth("200px").setTextAlign("left") );
		container.add( sourseNumberRow );

		var managerRow = new UI.Row();
		container.add(managerRow);

		info.appendChild(container.dom);
		info.style.display = "block";

	}

	function addInfo(object){
		document.createElement("canvas");
		//canvas.width = 
		var texture = new THREE.Texture( canvas);
		texture.needsUpdate = true;
		var material = new THREE.MeshBasicMaterial({map:texture});
		var geometry = new THREE.PlaneBufferGeometry( 5, 5, 4 );
		var mesh = new THREE.Mesh( geometry,material );
		mesh.position.set(object.position.x+15,object.position.y+3,9);

		var lgeometry = new THREE.Geometry();
		var lmaterial = new THREE.LineBasicMaterial({color: 0x66ffff});
		lgeometry.vertices.push(object.position );
		lgeometry.vertices.push(mesh.position);
		var line = new THREE.Line(lgeometry,lmaterial);
		lineGroup.add(line);
		lineGroup.add(mesh);
	}

	function addText(object){
		var text = object.userData.equip_type;
		var mesh = new THREE.TextGeometry(text);
		mesh.position=new THREE.Vector3(object.position.x+1,object.position.y+1,object.position.z+2);
		return mesh;
	}

	function onTouchMove( event ) {

		var x, y;
		if ( event.changedTouches ) {
			x = event.changedTouches[ 0 ].pageX;
			y = event.changedTouches[ 0 ].pageY;
		} else {
			x = event.clientX;
			y = event.clientY;
		}
		mouse.x = ( x / window.innerWidth ) * 2 - 1;
		mouse.y = - ( y / window.innerHeight ) * 2 + 1;
		checkIntersection();
	}

	function addSelectedObject( object ) {

		selectedObjects = [];
		selectedObjects.push( object );
	}

	function checkIntersection() {

		raycaster.setFromCamera( mouse, camera );
		var intersects = raycaster.intersectObjects( [group], true );

		if ( intersects.length > 0 ) {
			var selectedObject = intersects[ 0 ].object;
			//lineGroup.add(addText(selectedObject));
			addSelectedObject( selectedObject );
			outlinePass.selectedObjects = selectedObjects;
		} 

	}
