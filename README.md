LightScytheJS: Light Paininting with LED Stripes
================================================

LightScytheJS is a control software for a LED stripe light painting tool written entirely in javascript/node.js.

The basic idea for this tool was developed by The Mechatronics Guy and brought to life with the [LightScythe](https://sites.google.com/site/mechatronicsguy/lightscythe) project which in turn took inspiration from [Immaterials: light painting WiFi](http://www.nearfield.org/2011/02/wifi-light-painting).

![example1: ceshire cat](https://raw.github.com/alxlo/LightScytheJS/master/docimages/ceshirecat.jpg)
photograph by [Martin Voigt](http://martin.weickersdorf.de/)

So the LightScyteJS is more an evolution of an existing concept than a new idea. It was intended to be an excercise to get accostumed to node.js using the [Cubieboard](http://cubieboard.org/) platform and improved the original in some aspects:
* Pure node.js makes the code easy to understand and to maintain for people not used to microcontroller platforms.
* A web interface utilizing [express](https://github.com/visionmedia/express) and [jQueryMobile](http://jquerymobile.com/) provides convenient and fine tuned control of the device in the field.
* Images to be displayed need no special preparation and are pre-processed on the device using [gm](http://aheckmann.github.io/gm/) and [GraphicsMagick](http://www.graphicsmagick.org/). 

![example2: some text](https://raw.github.com/alxlo/LightScytheJS/master/docimages/senftenberg2013.jpg)
photograph by [Martin Voigt](http://martin.weickersdorf.de/)

Hardware
--------

![LightScytheJS Hardware](https://github.com/alxlo/LightScytheJS/raw/master/docimages/hardware.jpg)

The hardware consists of
* a cubieboard (raspberry Pi should work as well)
* a WS2801 LED strip
* an USB wifi dongle
* a 2S LiPo and 5V BEC for power supply


[![endorse](https://api.coderwall.com/alxlo/endorsecount.png)](https://coderwall.com/alxlo)
