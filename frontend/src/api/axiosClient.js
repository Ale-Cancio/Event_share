import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:5000/api", // your backend URL
});

export default axiosClient;
