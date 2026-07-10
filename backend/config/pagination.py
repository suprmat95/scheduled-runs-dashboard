from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    """Page-number pagination with a client-tunable, capped page size.

    `?page=2&page_size=100`. The cap stops a client from asking for the whole
    table in one request, which is the point of paginating at scale.
    """

    page_size_query_param = "page_size"
    max_page_size = 200
