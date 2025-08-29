import axios from 'axios';
import * as FormData from 'form-data';

interface dataRes {
  data: Array<any>;
  message: string;
}

const handleAndUploadFile = async (req: Request): Promise<dataRes> => {
  const files = req['files'];
  const form = new FormData();
  files.forEach((file: Express.Multer.File) => {
    form.append('files', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
  });
  const res = await axios.post(process.env.STORES_FILES, form, {
    headers: form.getHeaders(),
  });
  return res.data;
};

export {handleAndUploadFile};
