import { Widgets } from 'blessed';

declare module 'reblessed' {
  export * from 'blessed'

  export class Box extends Widgets.BoxElement {}
  export class TextElement extends Widgets.TextElement {}
  export class ListTable extends Widgets.ListTableElement {}
  export class List extends Widgets.ListElement  {}
  export class Log extends Widgets.Log  {}
  export class BigText extends Widgets.BoxElement {}

  export function image(options?: Widgets.BoxOptions): Widgets.BoxElement;
}