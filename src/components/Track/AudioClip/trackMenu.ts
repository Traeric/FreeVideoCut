import {AudioTrackInfo} from "../../../types/cutTask.ts";
import ContextMenu from "@imengyu/vue3-context-menu";
import {h} from "vue";

export function renderTrackContextmenu(e: MouseEvent, _audio: AudioTrackInfo) {
    return ContextMenu.showContextMenu({
        x: e.x,
        y: e.y,
        theme: 'mac dark',
        items: [
            {
                label: "删除音频轨道",
                icon: h('img', {
                    src: '/delete.svg',
                    style: {
                        width: '20px',
                        height: '20px',
                    },
                }),
                onClick: () => {
                },
            },
        ]
    });
}