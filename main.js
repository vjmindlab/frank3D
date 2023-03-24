import {
  Raycaster,
  Clock,
  Scene,
  EquirectangularReflectionMapping,
  sRGBEncoding,
  ACESFilmicToneMapping,
  PerspectiveCamera,
  AnimationMixer,
  AnimationClip,
  HemisphereLight,
  DirectionalLight,
  Vector2,
  PlaneGeometry,
  Mesh,
  MeshBasicMaterial,
  LoopOnce,
  MathUtils,
  WebGLRenderer,
  ShadowMaterial,
  Fog,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

// Set our main variables
let scene,
  renderer,
  texture,
  camera,
  model, // Our character
  neck, // Reference to the neck bone in the skeleton
  waist, // Reference to the waist bone in the skeleton
  possibleAnims, // Animations found in our file
  mixer, // THREE.js animations mixer
  idle, // Idle, the default state our character returns to
  clock = new Clock(), // Used for anims, which run to a clock instead of frame rate
  currentlyAnimating = false, // Used to check whether characters neck is being used in another anim
  raycaster = new Raycaster(), // Used to detect the click on our character
  loaderAnim = document.getElementById('js-loader');

// const params = {
//   color: '#212121',
// };

init();
function init() {
  const MODEL_PATH = 'frank2.glb';
  const canvas = document.querySelector('#c');

  // Init the scene
  scene = new Scene();
  // scene.background = new Color(params.color);
  // scene.fog = new Fog(params.color, 60, 100);

  new RGBELoader()
    .setPath('')
    .load('neutral.hdr', function (texture) {
      texture.mapping = EquirectangularReflectionMapping;
      scene.environment = texture;
    });

  // Init the renderer
  renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);

  // Add a camera
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 20;
  camera.position.x = 0;
  camera.position.y = -3.5;

  var loader = new GLTFLoader();

  loader.load(
    MODEL_PATH,
    function (gltf) {
      model = gltf.scene;
      let fileAnimations = gltf.animations;

      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.envMap = texture;
        }
        // Reference the neck and waist bones
        if (o.isBone && o.name === 'Neck') {
          neck = o;
        }
        if (o.isBone && o.name === 'Spine') {
          waist = o;
        }
      });

      model.scale.set(7, 7, 7);
      model.position.y = -11;

      scene.add(model);

      loaderAnim.remove();

      mixer = new AnimationMixer(model);

      let clips = fileAnimations.filter((val) => val.name !== 'idle');
      possibleAnims = clips.map((val) => {
        let clip = AnimationClip.findByName(clips, val.name);

        clip.tracks.splice(3, 3);
        clip.tracks.splice(9, 3);

        clip = mixer.clipAction(clip);
        return clip;
      });

      let idleAnim = AnimationClip.findByName(fileAnimations, 'idle');

      idleAnim.tracks.splice(3, 3);
      idleAnim.tracks.splice(9, 3);

      idle = mixer.clipAction(idleAnim);
      idle.play();
    },
    undefined, // We don't need this function
    function (error) {
      console.error(error);
    }
  );

  // Add lights
  let hemiLight = new HemisphereLight(0xffffff, 0xffffff, 0.2);
  hemiLight.position.set(0, 0, 0);
  // Add hemisphere light to scene
  scene.add(hemiLight);

  let d = 10.25;
  let dirLight = new DirectionalLight(0xffffff, 0.2);
  dirLight.position.set(-8, 12, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize = new Vector2(1024, 1024);
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 1500;
  dirLight.shadow.camera.left = d * -1;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = d * -1;
  // Add directional Light to scene
  scene.add(dirLight);

  // Floor
  let floorGeometry = new PlaneGeometry(5000, 5000, 1, 1);
  let floorMaterial = new ShadowMaterial({
    // color: 0x516f2a,
    // shininess: 1,
    opacity: 0.5,
  });

  let floor = new Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -0.5 * Math.PI;
  floor.receiveShadow = true;
  floor.position.y = -11;
  scene.add(floor);

  let geometry = new PlaneGeometry(4, 15, 1, 1);
  let material = new MeshBasicMaterial({
    color: 0x516f2a,
    opacity: 0,
    transparent: true,
  }); // 0xf2ce2e
  let clickmesh = new Mesh(geometry, material);

  clickmesh.position.z = 2;
  clickmesh.position.y = -5.5;
  clickmesh.position.x = 0;
  clickmesh.name = 'yo';
  scene.add(clickmesh);
}

function render() {
  if (mixer) {
    mixer.update(clock.getDelta());
  }

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let canvasPixelWidth = canvas.width / window.devicePixelRatio;
  let canvasPixelHeight = canvas.height / window.devicePixelRatio;

  const needResize =
    canvasPixelWidth !== width || canvasPixelHeight !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

window.addEventListener('click', (e) => raycast(e));
window.addEventListener('touchend', (e) => raycast(e, true));

function raycast(e, touch = false) {
  var mouse = {};
  if (touch) {
    mouse.x =
      2 * (e.changedTouches[0].clientX / window.innerWidth) - 1;
    mouse.y =
      1 - 2 * (e.changedTouches[0].clientY / window.innerHeight);
  } else {
    mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
    mouse.y = 1 - 2 * (e.clientY / window.innerHeight);
  }
  // update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // calculate objects intersecting the picking ray
  var intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects[0]) {
    var object = intersects[0].object;
    if (object.name === 'yo') {
      if (!currentlyAnimating) {
        currentlyAnimating = true;
        playOnClick();
      }
    }
  }
}

// Get a random animation, and play it
function playOnClick() {
  let anim = Math.floor(Math.random() * possibleAnims.length) + 0;
  playModifierAnimation(idle, 0.25, possibleAnims[anim], 0.25);
}

function playModifierAnimation(from, fSpeed, to, tSpeed) {
  to.setLoop(LoopOnce);
  to.reset();
  to.play();
  from.crossFadeTo(to, fSpeed, true);
  setTimeout(function () {
    from.enabled = true;
    to.crossFadeTo(from, tSpeed, true);
    currentlyAnimating = false;
  }, to._clip.duration * 1000 - (tSpeed + fSpeed) * 1000);
}

document.addEventListener('mousemove', function (e) {
  var mousecoords = getMousePos(e);
  if (neck && waist) {
    moveJoint(mousecoords, neck, 50);
    moveJoint(mousecoords, waist, 30);
  }
});

function getMousePos(e) {
  return { x: e.clientX, y: e.clientY };
}

function moveJoint(mouse, joint, degreeLimit) {
  let degrees = getMouseDegrees(mouse.x, mouse.y, degreeLimit);
  joint.rotation.y = MathUtils.degToRad(degrees.x);
  joint.rotation.x = MathUtils.degToRad(degrees.y);
}

function getMouseDegrees(x, y, degreeLimit) {
  let dx = 0,
    dy = 0,
    xdiff,
    xPercentage,
    ydiff,
    yPercentage;

  let w = { x: window.innerWidth, y: window.innerHeight * 0.4 };

  // Left (Rotates neck left between 0 and -degreeLimit)
  // 1. If cursor is in the left half of screen
  if (x <= w.x / 2) {
    // 2. Get the difference between middle of screen and cursor position
    xdiff = w.x / 2 - x;
    // 3. Find the percentage of that difference (percentage toward edge of screen)
    xPercentage = (xdiff / (w.x / 2)) * 100;
    // 4. Convert that to a percentage of the maximum rotation we allow for the neck
    dx = ((degreeLimit * xPercentage) / 100) * -1;
  }

  // Right (Rotates neck right between 0 and degreeLimit)
  if (x >= w.x / 2) {
    xdiff = x - w.x / 2;
    xPercentage = (xdiff / (w.x / 2)) * 100;
    dx = (degreeLimit * xPercentage) / 100;
  }
  // Up (Rotates neck up between 0 and -degreeLimit)
  if (y <= w.y / 2) {
    ydiff = w.y / 2 - y;
    yPercentage = (ydiff / (w.y / 2)) * 100;
    // Note that I cut degreeLimit in half when she looks up
    dy = ((degreeLimit * 0.5 * yPercentage) / 100) * -1;
  }
  // Down (Rotates neck down between 0 and degreeLimit)
  if (y >= w.y / 2) {
    ydiff = y - w.y / 2;
    yPercentage = (ydiff / (w.y / 2)) * 100;
    dy = ((degreeLimit / 5.5) * yPercentage) / 100;
  }
  return { x: dx, y: dy };
}
