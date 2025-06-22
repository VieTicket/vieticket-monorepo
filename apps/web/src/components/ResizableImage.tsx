import { Node, mergeAttributes } from "@tiptap/core";

export const ResizableImage = Node.create({
  name: "resizableImage",

  group: "block",
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: "300",
        parseHTML: (el) =>
          el.getAttribute("data-width") || el.getAttribute("width"),
        renderHTML: (attrs) => ({
          "data-width": attrs.width,
          width: attrs.width,
        }),
      },
      height: {
        default: "auto",
        parseHTML: (el) =>
          el.getAttribute("data-height") || el.getAttribute("height"),
        renderHTML: (attrs) => ({
          "data-height": attrs.height,
          height: attrs.height,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type='resizable-image']",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "resizable-image",
        contenteditable: "false",
        style: "position: relative; display: inline-block;",
      }),
      [
        "img",
        {
          src: HTMLAttributes.src,
          width: HTMLAttributes.width,
          height: HTMLAttributes.height,
          style: "display: block; max-width: 100%; height: auto;",
        },
      ],
      [
        "span",
        {
          class: "resize-handle",
          contenteditable: "false",
        },
      ],
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const outer = document.createElement("div");
      outer.setAttribute("data-type", "resizable-image");
      outer.contentEditable = "false";
      outer.style.position = "relative";
      outer.style.display = "inline-block";
      outer.tabIndex = 0;

      const img = document.createElement("img");
      img.src = node.attrs.src;
      img.style.width = node.attrs.width || "300px";
      img.style.height = node.attrs.height || "auto";
      img.style.display = "block";
      img.style.maxWidth = "100%";

      const handle = document.createElement("span");
      handle.className = "resize-handle";
      Object.assign(handle.style, {
        position: "absolute",
        right: "0",
        bottom: "0",
        width: "12px",
        height: "12px",
        background: "#aaa",
        cursor: "nwse-resize",
        zIndex: "10",
        contentEditable: "false",
      });

      outer.appendChild(img);
      outer.appendChild(handle);

      let startX = 0;
      let startWidth = 0;

      const onMouseMove = (event: MouseEvent) => {
        console.log("mousemove", event.clientX);
        const diffX = event.clientX - startX;
        const newWidth = Math.max(50, startWidth + diffX);
        img.style.width = `${newWidth}px`;

        // cập nhật node
        const transaction = editor.state.tr.setNodeMarkup(getPos(), undefined, {
          ...node.attrs,
          width: `${newWidth}`,
        });
        editor.view.dispatch(transaction);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      handle.addEventListener("mousedown", (event) => {
        console.log("mousedown", event);
        event.preventDefault();
        startX = event.clientX;
        startWidth = img.offsetWidth;

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });

      return {
        dom: outer,
      };
    };
  },
});
