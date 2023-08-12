import { axiosPrivate } from "../api/axios";
import { useEffect } from "react";
import useRefreshToken from "./useRefreshToken";
import useAuth from "./useAuth";

const useAxiosPrivate = () => {
    const refresh = useRefreshToken();
    const { auth } = useAuth();

    useEffect(() => {
        // axios request interceptor
        const requestIntercept = axiosPrivate.interceptors.request.use(
            config => {
                // if no Authorization in the request header, add the Authorization request header and assign with accessToken store in auth state
                if (!config.headers['Authorization']) {
                    config.headers['Authorization'] = `Bearer ${auth?.accessToken}`;
                }
                return config; // if there is no error return the config
            }, (error) => Promise.reject(error) // if there is error reject with error
        );

        // axios response interceptor
        const responseIntercept = axiosPrivate.interceptors.response.use(
            // if there is no error return the response
            response => response,
            // if there is error run the async error function below
            async (error) => {
                // get the previous request from error config (set in the above request interceptor)
                const prevRequest = error?.config;
                // if the response status is 403 (forbiden, return from backend api to mean the accessToken is expired)
                // if the prevRequest.sent key is false (no sent key) that means it is the first response, this to prevent multiple request 
                // if the response status multiple 403
                if (error?.response?.status === 403 && !prevRequest?.sent) {
                    prevRequest.sent = true;
                    // hit the api refresh endpoint which return a new access token
                    const newAccessToken = await refresh();
                    // assign the Authorization header with the new access token
                    prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    // hit the api again with the new access token, if there is no error return
                    return axiosPrivate(prevRequest);
                }
                // if there is error reject with the error
                return Promise.reject(error);
            }
        );

        return () => {
            axiosPrivate.interceptors.request.eject(requestIntercept);
            axiosPrivate.interceptors.response.eject(responseIntercept);
        }
    }, [auth, refresh]) // for effect of auth and refresh endpoint only

    return axiosPrivate;
}

export default useAxiosPrivate;