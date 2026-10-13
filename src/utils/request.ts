import axios from 'axios'
import { ImgList, ImgDel, ImgReq, Folder, ImgItem, AuthToken } from "./types"
import storage from "./storage"

// ElNotification 由 vite 插件按需注入，不再从 element-plus 主入口整包引入
const request = axios.create({
	baseURL: import.meta.env.VITE_APP_API_URL,
	timeout: 200000
})

request.interceptors.request.use(
	(config) => {
		const token = storage.local.get('auth-token')
		if (token) {
			// @ts-ignore
			config.headers['Authorization'] = token
		}
		return config
	}
)

request.interceptors.response.use(
	(response) => {
		const data = response.data;
		if (data.code === 401) {
			// token 失效：清掉并回登录页
			storage.local.remove('auth-token')
			window.location.href = '/auth'
			return Promise.reject(data.msg)
		}
		if (data.code !== 200) {
			ElNotification({
				message: data.msg,
				duration: 0,
				type: 'error'
			})
			return Promise.reject(data.msg)
		}
		return data.data
	},
	(error) => {
		ElNotification({
			message: error?.response?.data || String(error),
			duration: 0,
			type: 'error'
		})
		return Promise.reject(error)
	}
)

export const requestListImages = (data: ImgReq): Promise<ImgList> => request.post('/rest/list', data)
export const requestUploadImages = (data: FormData): Promise<ImgItem[]> => request.post('/rest/upload', data)
export const createFolder = (data: Folder) => request.post('/rest/folder', data)
export const checkToken = (data: AuthToken) => request.post('/rest/checkToken', data)
export const requestDeleteImage = (data: ImgDel) => request.delete('/rest', { data })
