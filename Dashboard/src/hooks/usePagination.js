import { useState } from 'react';
export function usePagination(items,pageSize=10,filterKey=''){
 const [state,setState]=useState({page:1,key:filterKey});
 const page=state.key===filterKey?Math.min(state.page,Math.max(1,Math.ceil(items.length/pageSize))):1;
 return {page,pageSize,total:items.length,items:items.slice((page-1)*pageSize,page*pageSize),onChange:p=>setState({page:p,key:filterKey})};
}

