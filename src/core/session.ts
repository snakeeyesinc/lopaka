import {generateUID} from '../utils';
import {reactive, UnwrapRef} from 'vue';
import {Platform} from 'src/platforms/platform';
import {Point} from './point';
import {AbstractTool} from '../draw/tools/abstract.tool';
import {VirtualScreen} from '../draw/virtual-screen';
import {FlipperPlatform} from '../platforms/flipper';
import {PaintTool} from '../draw/tools/paint.tool';
import {BoxTool} from '../draw/tools/box.tool';
import {FrameTool} from '../draw/tools/frame.tool';
import {CircleTool} from '../draw/tools/circle.tool';
import {DiscTool} from '../draw/tools/disc.tool';
import {LineTool} from '../draw/tools/line.tool';
import {DotTool} from '../draw/tools/dot.tool';
import {TextTool} from '../draw/tools/text.tool';
import {SelectTool} from '../draw/tools/select.tool';
import {U8g2Platform} from '../platforms/u8g2';
import {AdafruitPlatform} from '../platforms/adafruit';
import {Uint32RawPlatform} from '../platforms/uint32-raw';
import {IconTool} from '../draw/tools/icon.tool';
import {getFont, loadFont} from '../draw/fonts';
import {AbstractLayer} from './layers/abstract.layer';
import {ChangeHistory, useHistory} from './history';
import {Editor} from '../editor/editor';

const sessions = new Map<string, UnwrapRef<Session>>();
let currentSessionId = null;

type TSessionState = {
    platform: string;
    display: Point;
    layers: AbstractLayer[];
    activeTool: AbstractTool | null;
    scale: Point;
    lock: boolean;
};

export class Session {
    id: string = generateUID();
    platforms: {[key: string]: Platform} = {
        [FlipperPlatform.id]: new FlipperPlatform(),
        [U8g2Platform.id]: new U8g2Platform(),
        [AdafruitPlatform.id]: new AdafruitPlatform(),
        [Uint32RawPlatform.id]: new Uint32RawPlatform()
    };
    displays: Point[] = [
        new Point(8, 8),
        new Point(12, 8),
        new Point(32, 8),
        new Point(48, 64),
        new Point(64, 8),
        new Point(60, 32),
        new Point(64, 32),
        new Point(64, 48),
        new Point(64, 128),
        new Point(72, 40),
        new Point(84, 48),
        new Point(96, 16),
        new Point(96, 32),
        new Point(96, 39),
        new Point(96, 40),
        new Point(96, 65),
        new Point(96, 68),
        new Point(96, 96),
        new Point(100, 64),
        new Point(102, 64),
        new Point(122, 32),
        new Point(128, 32),
        new Point(128, 36),
        new Point(128, 64),
        new Point(128, 80),
        new Point(128, 96),
        new Point(128, 128),
        new Point(128, 160),
        new Point(144, 168),
        new Point(150, 32),
        new Point(160, 16),
        new Point(160, 32),
        new Point(160, 80),
        new Point(160, 132),
        new Point(160, 160),
        new Point(172, 72),
        new Point(192, 32),
        new Point(192, 64),
        new Point(192, 96),
        new Point(200, 200),
        new Point(206, 36),
        new Point(240, 64),
        new Point(240, 128),
        new Point(240, 160),
        new Point(256, 128),
        new Point(256, 32),
        new Point(256, 64),
        new Point(296, 128),
        new Point(320, 200),
        new Point(320, 240),
        new Point(400, 240)
    ];

    state: TSessionState = reactive({
        lock: false,
        platform: null,
        display: new Point(128, 64),
        layers: [],
        activeLayer: null,
        activeTool: null,
        scale: new Point(4, 4)
    });

    history: ChangeHistory = useHistory();

    editor: Editor = new Editor(this);

    virtualScreen: VirtualScreen = new VirtualScreen(this, {
        ruler: false,
        smartRuler: false,
        highlight: true,
        pointer: false
    });

    tools: {[key: string]: AbstractTool} = {
        // select: new SelectTool(this),
        // paint: new PaintTool(this),
        frame: new FrameTool(this),
        box: new BoxTool(this),
        line: new LineTool(this),
        dot: new DotTool(this),
        circle: new CircleTool(this),
        disc: new DiscTool(this),
        string: new TextTool(this),
        icon: new IconTool(this)
    };
    removeLayer = (layer: AbstractLayer) => {
        this.state.layers = this.state.layers.filter((l) => l !== layer);
        this.history.push({
            type: 'remove',
            layer,
            state: layer.getState()
        });
    };
    addLayer = (layer: AbstractLayer) => {
        layer.resize(this.state.display, this.state.scale);
        this.state.layers.unshift(layer);
        this.history.push({
            type: 'add',
            layer,
            state: layer.getState()
        });
        layer.draw();
    };
    setActiveTool = (tool: AbstractTool) => {
        this.state.activeTool = tool;
    };
    setDisplay = (display: Point) => {
        this.state.display = display;
        this.virtualScreen.resize();
        this.virtualScreen.redraw();
    };
    setPlatform = (name: string) => {
        this.state.platform = name;
        const textTool: TextTool = this.tools.string as TextTool;
        const font = this.platforms[name].getFonts()[0];
        this.lock();
        // preload default font
        loadFont(font).then(() => {
            textTool.lastFont = getFont(font.name);
            this.unlock();
            this.virtualScreen.redraw();
        });
    };
    lock = () => {
        this.state.lock = true;
    };
    unlock = () => {
        this.state.lock = false;
    };
    constructor() {}
}

export function useSession(id?: string) {
    if (currentSessionId) {
        return sessions.get(currentSessionId);
    } else {
        const session = new Session();
        session.setPlatform(U8g2Platform.id);
        session.state.activeTool = session.tools.frame;
        sessions.set(session.id, session);
        currentSessionId = session.id;
        return session;
    }
}
