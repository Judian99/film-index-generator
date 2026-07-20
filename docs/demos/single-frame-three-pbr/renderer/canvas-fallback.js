export class CanvasFallbackRenderer {
  constructor({ canvas }) {
    this.canvas = canvas;
    this.state = {
      source: null,
      filmFormat: "135",
      pose: { rotation: 0.35, lift: 0 },
      previewScale: 1,
      showStructure: false,
      width: 640,
      height: 480,
      dpr: 1,
    };
  }

  setFilm({ source, filmFormat }) {
    this.state.source = source;
    this.state.filmFormat = filmFormat;
  }

  setPose(pose, previewScale = 1) {
    this.state.pose = { ...pose };
    this.state.previewScale = previewScale;
  }

  setStructureVisible(visible) {
    this.state.showStructure = visible;
  }

  setSize(width, height, dpr) {
    this.state.width = width;
    this.state.height = height;
    this.state.dpr = dpr;
  }

  render() {
    FilmFrameStyles.renderFrame(this.canvas, this.state.source, "filmFrame135", {
      width: this.state.width,
      height: this.state.height,
      dpr: this.state.dpr,
      filmFormat: this.state.filmFormat,
      pose: this.state.pose,
      previewScale: this.state.previewScale,
      showStructure: this.state.showStructure,
    });
  }

  dispose() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
