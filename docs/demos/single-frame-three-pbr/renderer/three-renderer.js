import * as THREE from "../vendor/three.module.js";
import { buildFilmAssets, createTableTexture } from "./film-assets.js";

export class ThreeFilmRenderer {
  constructor({ canvas, onContextLost }) {
    this.canvas = canvas;
    this.onContextLost = onContextLost;
    this.assets = null;
    this.settings = null;
    this.pose = { rotation: 0.35, lift: 0 };
    this.previewScale = 1;
    this.width = 640;
    this.height = 480;

    const context = canvas.getContext("webgl2", {
      antialias: true,
      alpha: false,
      depth: true,
      stencil: true,
      powerPreference: "high-performance",
    });
    if (!context) throw new Error("WebGL2 不可用。");

    this.renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xc9c2b6, 1);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc9c2b6);
    this.scene.fog = null;
    this.camera = new THREE.PerspectiveCamera(28, 4 / 3, 0.1, 50);
    this.camera.position.set(0, 5.25, 8.7);
    this.camera.lookAt(0, 0.15, 0);

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.createStudio();

    this.handleContextLost = event => {
      event.preventDefault();
      this.onContextLost?.(new Error("WebGL 上下文已丢失。"));
    };
    canvas.addEventListener("webglcontextlost", this.handleContextLost, false);
  }

  createStudio() {
    const tableTexture = createTableTexture();
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8c0b3,
      map: tableTexture,
      roughness: 0.91,
      metalness: 0,
    });
    this.table = new THREE.Mesh(new THREE.PlaneGeometry(24, 16, 1, 1), tableMaterial);
    this.table.rotation.x = -Math.PI / 2;
    this.table.position.y = -1.05;
    this.table.receiveShadow = true;
    this.scene.add(this.table);

    const hemisphere = new THREE.HemisphereLight(0xfff6e7, 0x6c5d4d, 0.82);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xffe5c0, 2.35);
    key.position.set(-4.8, 7.2, 4.6);
    key.target.position.set(0, -0.1, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 18;
    key.shadow.bias = -0.00018;
    key.shadow.normalBias = 0.025;
    this.scene.add(key, key.target);

    const fill = new THREE.DirectionalLight(0xc7ddff, 0.52);
    fill.position.set(5, 3.8, 2.2);
    fill.target.position.set(0, 0, 0);
    this.scene.add(fill, fill.target);

    const rim = new THREE.DirectionalLight(0xffb36f, 0.82);
    rim.position.set(1.8, 2.2, -5);
    rim.target.position.set(0, 0.2, 0);
    this.scene.add(rim, rim.target);
  }

  setFilm({ source, filmFormat, maxTextureSize }) {
    this.assets?.dispose();
    if (this.assets) {
      this.root.remove(this.assets.group);
      this.scene.remove(this.assets.contact);
    }
    this.settings = { source, filmFormat, maxTextureSize };
    this.assets = buildFilmAssets(this.settings);
    this.root.add(this.assets.group);
    this.scene.add(this.assets.contact);
    this.applyPose();
    this.frameScene();
  }

  setPose(pose, previewScale = 1) {
    this.pose = { ...pose };
    this.previewScale = previewScale;
    this.applyPose();
  }

  applyPose() {
    if (!this.assets) return;
    const group = this.assets.group;
    const lift = THREE.MathUtils.clamp(this.pose.lift || 0, -0.2, 1);
    const roll = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(this.pose.rotation || 0, -6, 6));
    const tilt = -0.62 + lift * 0.055;
    group.rotation.set(tilt, roll * 0.2, roll);
    const surfaceY = -1.02;
    const restingHalfHeight = this.assets.dimensions.height * 0.5 * Math.abs(Math.cos(tilt));
    group.position.set(0, surfaceY + restingHalfHeight + 0.025 + lift * 0.48, 0.1 + lift * 0.22);
    group.scale.setScalar(this.previewScale);

    const contact = this.assets.contact;
    contact.position.set(group.position.x + 0.1, -1.035, group.position.z + 0.18);
    contact.rotation.z = roll;
    contact.scale.setScalar(this.previewScale * (1 - lift * 0.13));
    contact.material.opacity = Math.max(0.16, 0.5 - lift * 0.22);
  }

  setStructureVisible(visible) {
    if (this.assets) this.assets.structure.visible = visible;
  }

  setSize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.renderer.setPixelRatio(Math.min(2, Math.max(1, dpr || 1)));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.frameScene();
  }

  frameScene() {
    if (!this.assets) return;
    const { width, height } = this.assets.dimensions;
    const fitHeight = Math.max(height, width / Math.max(this.camera.aspect, 0.55));
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
    const distance = THREE.MathUtils.clamp((fitHeight * 0.5) / Math.tan(halfFov) * 1.34 + 0.8, 6.2, 36);
    this.camera.position.set(0, distance * 0.48, distance);
    this.camera.lookAt(0, -0.1, 0);
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost, false);
    this.assets?.dispose();
    this.table?.geometry.dispose();
    this.table?.material.map?.dispose();
    this.table?.material.dispose();
    this.renderer.dispose();
  }
}
