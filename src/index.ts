import PDFParser from 'pdf2json';
console.log('HPI module parser');


const pdfParser = new PDFParser();

class Course {
  constructor(public name: string, public code: string, public hours: number, public descr: string, public teachers: string, public assignedModules: Module[]) {}
}

class Module {
  constructor(public name: string) {}

  public courses: Course[] = [];
}

class ModuleGroup {
  constructor(public name: string) {}

  public modules: Module[] = [];
}


pdfParser.on("pdfParser_dataReady", pdfData => {
  const pages = pdfData.Pages;
  const moduleGroups: ModuleGroup[] = [];

  pages.forEach((page, idx) => {
    // if (idx !== 0) return;

    let textIdx = 0;
    let lastCourseCode = '';

    while (textIdx < page.Texts.length) {
      const text = page.Texts[textIdx++];
      let textStr = text.R.map(t => decodeURIComponent(t.T)).join('');
      const fontSize = text.R[0].TS[1];
      const fontName = text.R[0].TS[2];
      const xPos = text.x;

      if (fontSize === 37 && textStr.trim().length) {

        // check if next line also has a font size of 37 -> merge
        const nextText = page.Texts[textIdx];
        if (nextText && nextText.R[0].TS[1] === 37) {
          textStr += nextText.R.map(t => decodeURIComponent(t.T)).join('');
          textIdx++;
        }

        console.log('New Group', textStr);
        moduleGroups.push(new ModuleGroup(textStr));
      } 

      if (fontSize === 33 && textStr.trim().length) {
        const currModuleGroup = moduleGroups[moduleGroups.length - 1];
        if (!currModuleGroup) {
          console.error('No group found for module', textStr);
          continue;
        }

        // merge while next line has font size of 33
        while (page.Texts[textIdx] && page.Texts[textIdx].R[0].TS[1] === 33) {
          textStr += page.Texts[textIdx].R.map(t => decodeURIComponent(t.T)).join('');
          textIdx++;
        }

        console.log('New Module', textStr);
        currModuleGroup.modules.push(new Module(textStr));
      }

      if (fontSize === 28 && xPos === 1.266 && textStr.trim().length) {
        // might be couse code
        lastCourseCode = textStr;
      }

      if (fontSize === 29 && textStr.trim().length) {
        const currModule = moduleGroups[moduleGroups.length - 1].modules[moduleGroups[moduleGroups.length - 1].modules.length - 1];
        if (!currModule) {
          console.error('No module found for course', textStr);
          continue;
        }

        // merge while next line has font size of 29
        while (page.Texts[textIdx] && page.Texts[textIdx].R[0].TS[1] === 29) {
          textStr += page.Texts[textIdx].R.map(t => decodeURIComponent(t.T)).join('');
          textIdx++;
        }

        console.log('New Course', textStr, lastCourseCode);

        if (!lastCourseCode.length) {
          console.error('!!!! No course code found for course', textStr);
        }

        currModule.courses.push(new Course(textStr, lastCourseCode, 0, '', '', []));
        lastCourseCode = '';
      }

      // console.log(`Text: ${textStr}\nFont Size: ${fontSize}, Font Name: ${fontName} x: ${xPos}\n\n`);
    }
  });

  console.log('Finished parsing');

  moduleGroups.forEach(group => {
    console.log(`Group: ${group.name}`);
  });
});

pdfParser.on('pdfParser_dataError', (err) => console.error("Parser Error", err));

pdfParser.loadPDF('./itse-master-2425.pdf');
