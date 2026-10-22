# Speaker photos

Square 400×400 JPGs, referenced by file name in the `photo` field of a story
in [../../content.js](../../content.js), for example `photo: 'tom.jpg'`.
Stories without a photo show the speaker's initials instead.

The full-size originals live in `originals/`, which is gitignored and not
bundled into the app. To regenerate a web version (ImageMagick):

```bash
magick originals/tom.png -resize 400x400 -strip -quality 85 tom.jpg
```

Portrait originals (davy, yannick) were first cropped to a square around the
face, e.g. `-crop 1400x1400+190+0 +repage` for davy.
